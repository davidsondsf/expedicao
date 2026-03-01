import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Movement, MovementType } from '@/types';

type MovementRow = {
  id: string; type: string; quantity: number; item_id: string;
  user_id: string; note: string | null; created_at: string;
  items: {
    id: string; name: string; brand: string; model: string;
    barcode: string; quantity: number; min_quantity: number;
  } | null;
};

type ProfileRow = { user_id: string; name: string; email: string };

function mapMovement(row: MovementRow, profile?: ProfileRow): Movement {
  return {
    id: row.id,
    type: row.type as MovementType,
    quantity: row.quantity,
    itemId: row.item_id,
    userId: row.user_id,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    item: row.items ? {
      id: row.items.id, name: row.items.name, brand: row.items.brand,
      model: row.items.model, barcode: row.items.barcode,
      quantity: row.items.quantity, minQuantity: row.items.min_quantity,
      serialNumber: undefined, location: '', categoryId: '',
      active: true, createdAt: '', updatedAt: '',
    } : undefined,
    user: profile ? {
      id: row.user_id, name: profile.name, email: profile.email,
      role: 'OPERATOR', active: true, createdAt: '',
    } : undefined,
  };
}

async function fetchMovementsWithProfiles(itemId?: string) {
  let query = supabase
    .from('movements')
    .select('*, items(id, name, brand, model, barcode, quantity, min_quantity)')
    .order('created_at', { ascending: false });

  if (itemId) {
    query = query.eq('item_id', itemId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as MovementRow[];

  const userIds = [...new Set(rows.map(r => r.user_id))];
  const profilesMap = new Map<string, ProfileRow>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', userIds);
    for (const p of (profiles ?? []) as ProfileRow[]) {
      profilesMap.set(p.user_id, p);
    }
  }

  return rows.map(row => mapMovement(row, profilesMap.get(row.user_id)));
}

export function useMovements() {
  return useQuery({
    queryKey: ['movements'],
    queryFn: () => fetchMovementsWithProfiles(),
  });
}

export function useItemMovements(itemId: string) {
  return useQuery({
    queryKey: ['movements', 'item', itemId],
    queryFn: () => fetchMovementsWithProfiles(itemId),
    enabled: !!itemId,
  });
}

type CreateMovementInput = {
  type: MovementType;
  quantity: number;
  itemId: string;
  userId: string;
  note?: string;
};

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMovementInput) => {
      if (!input.userId) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await (supabase as any).rpc('create_movement_and_adjust_stock', {
        p_item_id: input.itemId,
        p_type: input.type,
        p_quantity: input.quantity,
        p_user_id: input.userId,
        p_note: input.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
