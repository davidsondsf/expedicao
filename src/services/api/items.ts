import { supabase } from '@/integrations/supabase/client';
import type { Item, ItemCondition } from '@/types';

export type CreateItemInput = {
  name: string;
  brand: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  minQuantity: number;
  location: string;
  categoryId: string;
  condition?: ItemCondition;
  photoUrl?: string;
};

export type UpdateItemInput = Partial<CreateItemInput> & { id: string };

export interface ItemService {
  list(): Promise<Item[]>;
  getById(id: string): Promise<Item>;
  create(input: CreateItemInput): Promise<Item>;
  update(input: UpdateItemInput): Promise<void>;
  deactivate(id: string): Promise<void>;
}

type ItemRow = {
  id: string;
  name: string;
  brand: string;
  model: string;
  serial_number: string | null;
  quantity: number;
  min_quantity: number;
  location: string;
  barcode: string;
  category_id: string | null;
  active: boolean;
  condition: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  categories: { id: string; name: string; active: boolean; created_at: string } | null;
};

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number ?? undefined,
    quantity: row.quantity,
    minQuantity: row.min_quantity,
    location: row.location,
    barcode: row.barcode,
    categoryId: row.category_id ?? '',
    active: row.active,
    condition: row.condition as ItemCondition | undefined,
    photoUrl: row.photo_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.categories
      ? {
          id: row.categories.id,
          name: row.categories.name,
          active: row.categories.active,
          createdAt: row.categories.created_at,
        }
      : undefined,
  };
}

async function nextBarcode(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_next_item_barcode');
  if (error || !data) throw error ?? new Error('Erro ao gerar código de barras');
  return data;
}

export const supabaseItemService: ItemService = {
  async list() {
    const { data, error } = await supabase
      .from('items')
      .select('*, categories(*)')
      .order('name');
    if (error) throw error;
    return (data ?? []).map(row => mapItem(row as unknown as ItemRow));
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('items')
      .select('*, categories(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapItem(data as unknown as ItemRow);
  },

  async create(input: CreateItemInput) {
    const barcode = await nextBarcode();
    const { data, error } = await supabase
      .from('items')
      .insert({
        name: input.name,
        brand: input.brand,
        model: input.model,
        serial_number: input.serialNumber || null,
        quantity: input.quantity,
        min_quantity: input.minQuantity,
        location: input.location,
        barcode,
        category_id: input.categoryId,
        condition: input.condition || null,
        photo_url: input.photoUrl || null,
      })
      .select('*, categories(*)')
      .single();

    if (error) throw error;
    return mapItem(data as unknown as ItemRow);
  },

  async update({ id, ...input }: UpdateItemInput) {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.serialNumber !== undefined) updateData.serial_number = input.serialNumber || null;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.minQuantity !== undefined) updateData.min_quantity = input.minQuantity;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
    if (input.condition !== undefined) updateData.condition = input.condition || null;
    if (input.photoUrl !== undefined) updateData.photo_url = input.photoUrl || null;

    const { error } = await supabase.from('items').update(updateData).eq('id', id);
    if (error) throw error;
  },

  async deactivate(id: string) {
    const { error } = await supabase.from('items').update({ active: false }).eq('id', id);
    if (error) throw error;
  },
};
