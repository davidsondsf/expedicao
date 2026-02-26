import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemService } from '@/services/api/index';
import type { CreateItemInput, UpdateItemInput } from '@/services/api/items';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => itemService.list(),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: () => itemService.getById(id),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateItemInput) => itemService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateItemInput) => itemService.update(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['items', vars.id] });
    },
  });
}

export function useDeactivateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemService.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}
