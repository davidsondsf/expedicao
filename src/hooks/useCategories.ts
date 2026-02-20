import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Category } from '@/types';

function mapCategory(row: {
  id: string; name: string; active: boolean; created_at: string;
}): Category {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(mapCategory);
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return mapCategory(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; active?: boolean }) => {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
