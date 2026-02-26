import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MaletaTecnica, MaletaItem, CreateMaletaInput } from '@/types/maleta';

type MaletaRow = {
  id: string;
  usuario_id: string;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  data_devolucao: string | null;
  status: string;
  observacoes: string | null;
  criado_por: string;
  created_at: string;
  updated_at: string;
};

type MaletaItemRow = {
  id: string;
  maleta_id: string;
  item_id: string;
  quantidade: number;
  numero_serie: string | null;
  created_at: string;
  items: { name: string; barcode: string; brand: string; model: string } | null;
};

type ProfileRow = { user_id: string; name: string; email: string };

function mapMaleta(row: MaletaRow, profiles: Map<string, ProfileRow>, itens?: MaletaItem[]): MaletaTecnica {
  const usuario = profiles.get(row.usuario_id);
  const criador = profiles.get(row.criado_por);
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    usuarioNome: usuario?.name,
    usuarioEmail: usuario?.email,
    dataEmprestimo: row.data_emprestimo,
    dataPrevistaDevolucao: row.data_prevista_devolucao,
    dataDevolucao: row.data_devolucao ?? undefined,
    status: row.status as MaletaTecnica['status'],
    observacoes: row.observacoes ?? undefined,
    criadoPor: row.criado_por,
    criadoPorNome: criador?.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itens,
  };
}

async function fetchProfiles(userIds: string[]): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  if (userIds.length === 0) return map;
  const { data } = await supabase
    .from('profiles')
    .select('user_id, name, email')
    .in('user_id', userIds);
  for (const p of (data ?? []) as ProfileRow[]) {
    map.set(p.user_id, p);
  }
  return map;
}

export function useMaletas() {
  return useQuery({
    queryKey: ['maletas'],
    queryFn: async () => {
      // Update overdue status first
      await (supabase.rpc as any)('update_maletas_atrasadas');

      const { data, error } = await supabase
        .from('maletas_tecnicas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as unknown as MaletaRow[];
      const userIds = [...new Set(rows.flatMap(r => [r.usuario_id, r.criado_por]))];
      const profiles = await fetchProfiles(userIds);

      return rows.map(row => mapMaleta(row, profiles));
    },
  });
}

export function useMaleta(id: string) {
  return useQuery({
    queryKey: ['maletas', id],
    queryFn: async () => {
      await (supabase.rpc as any)('update_maletas_atrasadas');

      const { data, error } = await supabase
        .from('maletas_tecnicas')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      const row = data as unknown as MaletaRow;

      // Fetch items
      const { data: itemsData } = await supabase
        .from('maleta_itens')
        .select('*, items(name, barcode, brand, model)')
        .eq('maleta_id', id);

      const itens: MaletaItem[] = ((itemsData ?? []) as unknown as MaletaItemRow[]).map(i => ({
        id: i.id,
        maletaId: i.maleta_id,
        itemId: i.item_id,
        quantidade: i.quantidade,
        numeroSerie: i.numero_serie ?? undefined,
        createdAt: i.created_at,
        itemNome: i.items?.name,
        itemBarcode: i.items?.barcode,
        itemBrand: i.items?.brand,
        itemModel: i.items?.model,
      }));

      const userIds = [row.usuario_id, row.criado_por];
      const profiles = await fetchProfiles(userIds);

      return mapMaleta(row, profiles, itens);
    },
    enabled: !!id,
  });
}

export function useCreateMaleta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMaletaInput & { criadoPor: string }) => {
      const { data, error } = await (supabase.rpc as any)('create_maleta', {
        _usuario_id: input.usuarioId,
        _data_prevista_devolucao: input.dataPrevistaDevolucao,
        _observacoes: input.observacoes ?? null,
        _criado_por: input.criadoPor,
        _itens: JSON.stringify(input.itens),
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maletas'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
    },
  });
}

export function useReturnMaleta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ maletaId, userId }: { maletaId: string; userId: string }) => {
      const { error } = await (supabase.rpc as any)('return_maleta', {
        _maleta_id: maletaId,
        _user_id: userId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maletas'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
    },
  });
}

// Stats for dashboard
export function useMaletaStats() {
  return useQuery({
    queryKey: ['maletas', 'stats'],
    queryFn: async () => {
      await (supabase.rpc as any)('update_maletas_atrasadas');

      const { data, error } = await supabase
        .from('maletas_tecnicas')
        .select('status, usuario_id');
      if (error) throw error;

      const rows = (data ?? []) as { status: string; usuario_id: string }[];
      const abertas = rows.filter(r => r.status === 'aberta').length;
      const atrasadas = rows.filter(r => r.status === 'atrasada').length;

      // Count loaned items
      const openMaletaIds = rows
        .filter(r => r.status === 'aberta' || r.status === 'atrasada')
        .map(r => (r as any).id);

      let itensEmprestados = 0;
      if (openMaletaIds.length > 0) {
        // Need to fetch from maleta_itens
        const { data: openMaletas } = await supabase
          .from('maletas_tecnicas')
          .select('id')
          .in('status', ['aberta', 'atrasada']);
        
        if (openMaletas && openMaletas.length > 0) {
          const ids = openMaletas.map(m => m.id);
          const { data: itemsData } = await supabase
            .from('maleta_itens')
            .select('quantidade')
            .in('maleta_id', ids);
          itensEmprestados = (itemsData ?? []).reduce((sum, i) => sum + (i as any).quantidade, 0);
        }
      }

      return { abertas, atrasadas, itensEmprestados };
    },
  });
}
