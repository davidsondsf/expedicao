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
  profiles: { id: string; name: string; email: string } | null;
};

function mapMovement(row: MovementRow): Movement {
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
    user: row.profiles ? {
      id: row.user_id, name: row.profiles.name, email: row.profiles.email,
      role: 'OPERATOR', active: true, createdAt: '',
    } : undefined,
  };
}

export function useMovements() {
  return useQuery({
    queryKey: ['movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movements')
        .select('*, items(id, name, brand, model, barcode, quantity, min_quantity), profiles(id, name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(row => mapMovement(row as unknown as MovementRow));
    },
  });
}

export function useItemMovements(itemId: string) {
  return useQuery({
    queryKey: ['movements', 'item', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movements')
        .select('*, items(id, name, brand, model, barcode, quantity, min_quantity), profiles(id, name, email)')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(row => mapMovement(row as unknown as MovementRow));
    },
    enabled: !!itemId,
  });
}

type CreateMovementInput = {
  type: MovementType;
  quantity: number;
  itemId: string;
  userId: string;
  note?: string;
  currentStock: number;
};

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMovementInput) => {
      if (input.type === 'EXIT' && input.quantity > input.currentStock) {
        throw new Error(`Estoque insuficiente! Disponível: ${input.currentStock}`);
      }

      const newQty = input.type === 'ENTRY'
        ? input.currentStock + input.quantity
        : input.currentStock - input.quantity;

      // Insert movement
      const { error: movErr } = await supabase.from('movements').insert({
        type: input.type,
        quantity: input.quantity,
        item_id: input.itemId,
        user_id: input.userId,
        note: input.note || null,
      });
      if (movErr) throw movErr;

      // Update item quantity
      const { error: itemErr } = await supabase
        .from('items')
        .update({ quantity: newQty })
        .eq('id', input.itemId);
      if (itemErr) throw itemErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
