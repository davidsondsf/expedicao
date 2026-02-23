import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/types';

export interface ManagedUser {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export function useAdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name, email, active, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as UserRole]) ?? []);

      const merged: ManagedUser[] = (profiles ?? []).map(p => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        active: p.active,
        created_at: p.created_at,
        role: roleMap.get(p.user_id) ?? 'OPERATOR',
      }));

      setUsers(merged);
    } catch {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const invokeAdmin = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const createUser = useCallback(async (params: { name: string; email: string; password: string; role: UserRole }) => {
    await invokeAdmin({ action: 'create', ...params });
    toast({ title: `Usuário ${params.name} criado com sucesso` });
    await loadUsers();
  }, [invokeAdmin, loadUsers, toast]);

  const updateUser = useCallback(async (userId: string, params: { name?: string; role?: UserRole; active?: boolean }) => {
    await invokeAdmin({ action: 'update', user_id: userId, ...params });
    toast({ title: 'Usuário atualizado' });
    await loadUsers();
  }, [invokeAdmin, loadUsers, toast]);

  const resetPassword = useCallback(async (userId: string, newPassword: string) => {
    await invokeAdmin({ action: 'reset_password', user_id: userId, new_password: newPassword });
    toast({ title: 'Senha redefinida com sucesso' });
  }, [invokeAdmin, toast]);

  return { users, isLoading, loadUsers, createUser, updateUser, resetPassword };
}
