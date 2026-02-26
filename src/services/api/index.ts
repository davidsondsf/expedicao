import { supabaseItemService } from './items';

const provider = import.meta.env.VITE_DATA_PROVIDER ?? 'supabase';

export const itemService = provider === 'supabase' ? supabaseItemService : supabaseItemService;
