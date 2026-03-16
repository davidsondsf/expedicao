import { supabase } from '@/integrations/supabase/client';
import type { Item, ItemCondition } from '@/types';

export type CreateItemInput = {
  name: string;
  brand: string;
  model: string;
  categoryId: string;
  requiresSerialNumber?: boolean;
  allowBulkMovement?: boolean;
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
  requires_serial_number: boolean;
  allow_bulk_movement: boolean;
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
    requiresSerialNumber: row.requires_serial_number,
    allowBulkMovement: row.allow_bulk_movement,
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
  const { data, error } = await (supabase as any).rpc('generate_next_item_barcode');
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
        barcode,
        category_id: input.categoryId,
        requires_serial_number: input.requiresSerialNumber ?? false,
        allow_bulk_movement: input.allowBulkMovement ?? true,
      } as any)
      .select('*, categories(*)')
      .single();

    if (error) throw error;
    return mapItem(data as unknown as ItemRow);
  },

  async update({ id, ...input }: UpdateItemInput) {
    const raw = input as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};
    if (raw.name !== undefined) updateData.name = raw.name;
    if (raw.brand !== undefined) updateData.brand = raw.brand;
    if (raw.model !== undefined) updateData.model = raw.model;
    if (raw.serialNumber !== undefined) updateData.serial_number = raw.serialNumber || null;
    if (raw.quantity !== undefined) updateData.quantity = raw.quantity;
    if (raw.minQuantity !== undefined) updateData.min_quantity = raw.minQuantity;
    if (raw.location !== undefined) updateData.location = raw.location;
    if (raw.categoryId !== undefined) updateData.category_id = raw.categoryId;
    if (raw.condition !== undefined) updateData.condition = raw.condition || null;
    if (raw.photoUrl !== undefined) updateData.photo_url = raw.photoUrl || null;
    if (raw.requiresSerialNumber !== undefined) updateData.requires_serial_number = raw.requiresSerialNumber;
    if (raw.allowBulkMovement !== undefined) updateData.allow_bulk_movement = raw.allowBulkMovement;

    const { error } = await supabase.from('items').update(updateData).eq('id', id);
    if (error) throw error;
  },

  async deactivate(id: string) {
    const { error } = await supabase.from('items').update({ active: false }).eq('id', id);
    if (error) throw error;
  },
};
