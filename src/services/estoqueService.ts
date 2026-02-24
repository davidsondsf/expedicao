import { supabase } from '@/integrations/supabase/client';
import type { MovimentacaoFiltros } from '@/types/estoque';

interface MovementRaw {
  type: string;
  quantity: number;
  created_at: string;
  item_id: string;
}

/**
 * Busca movimentações do banco com filtros opcionais.
 * - Se itemId fornecido, filtra por item (ignora categoria).
 * - Se categoryId fornecido, busca itens da categoria e filtra por eles.
 * - Filtra por intervalo de datas quando informado.
 */
export async function getMovimentacaoEstoque(
  params: MovimentacaoFiltros
): Promise<MovementRaw[]> {
  let query = supabase
    .from('movements')
    .select('type, quantity, created_at, item_id')
    .order('created_at', { ascending: true });

  // Filtro por item tem prioridade sobre categoria
  if (params.itemId) {
    query = query.eq('item_id', params.itemId);
  } else if (params.categoryId) {
    // Busca IDs dos itens da categoria
    const { data: catItems } = await supabase
      .from('items')
      .select('id')
      .eq('category_id', params.categoryId);
    const ids = (catItems ?? []).map(i => i.id);
    if (ids.length === 0) return [];
    query = query.in('item_id', ids);
  }

  if (params.startDate) {
    query = query.gte('created_at', params.startDate.toISOString());
  }
  if (params.endDate) {
    // Inclui o dia inteiro
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MovementRaw[];
}
