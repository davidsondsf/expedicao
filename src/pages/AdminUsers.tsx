import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldOff, User, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'ADMIN' | 'OPERATOR';

interface ManagedUser {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export default function AdminUsers() {
  const { user: currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name, email, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as UserRole]) ?? []);

      const merged: ManagedUser[] = (profiles ?? []).map(p => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        created_at: p.created_at,
        role: roleMap.get(p.user_id) ?? 'OPERATOR',
      }));

      setUsers(merged);
    } catch (err) {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  const toggleRole = async (targetUser: ManagedUser) => {
    if (targetUser.user_id === currentUser?.id) {
      toast({ title: 'Você não pode alterar seu próprio papel', variant: 'destructive' });
      return;
    }

    setUpdatingId(targetUser.user_id);
    const newRole: UserRole = targetUser.role === 'ADMIN' ? 'OPERATOR' : 'ADMIN';

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', targetUser.user_id);

      if (error) throw error;

      setUsers(prev =>
        prev.map(u => u.user_id === targetUser.user_id ? { ...u, role: newRole } : u)
      );

      toast({
        title: newRole === 'ADMIN'
          ? `${targetUser.name} promovido a ADMIN`
          : `${targetUser.name} rebaixado a OPERATOR`,
      });
    } catch {
      toast({ title: 'Erro ao atualizar papel', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const operatorCount = users.filter(u => u.role === 'OPERATOR').length;

  return (
    <AppLayout title="Administração de Usuários">
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h2 className="page-title">Gerenciar Usuários</h2>
            <p className="page-subtitle">Visualize e gerencie os papéis dos usuários do sistema</p>
          </div>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center gap-2 h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Atualizar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-1">Total de usuários</p>
            <p className="text-3xl font-bold text-foreground">{users.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-1">Administradores</p>
            <p className="text-3xl font-bold text-primary">{adminCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-1">Operadores</p>
            <p className="text-3xl font-bold" style={{ color: 'hsl(var(--info))' }}>{operatorCount}</p>
          </div>
        </div>

        {/* Warning: last admin */}
        {adminCount <= 1 && (
          <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-3"
            style={{ borderColor: 'hsl(var(--warning) / 0.3)', background: 'hsl(var(--warning) / 0.08)' }}>
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'hsl(var(--warning))' }} />
            <p className="text-sm" style={{ color: 'hsl(var(--warning))' }}>
              Há apenas <strong>{adminCount}</strong> administrador no sistema. Certifique-se de manter pelo menos um admin ativo.
            </p>
          </div>
        )}

        {/* Table */}
        <div className="stat-card p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Email</th>
                    <th>Papel</th>
                    <th>Cadastro</th>
                    <th className="text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isCurrentUser = u.user_id === currentUser?.id;
                    const isUpdating = updatingId === u.user_id;
                    return (
                      <tr key={u.user_id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-sm">
                              {u.name}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-xs text-muted-foreground font-normal">(você)</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm text-muted-foreground font-mono">{u.email}</td>
                        <td>
                          <span className={cn(
                            'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold',
                            u.role === 'ADMIN'
                              ? 'bg-primary/10 text-primary'
                              : 'text-info'
                          )}
                            style={u.role !== 'ADMIN' ? { background: 'hsl(var(--info) / 0.1)', color: 'hsl(var(--info))' } : {}}>
                            {u.role === 'ADMIN'
                              ? <><Shield className="h-3 w-3" />ADMIN</>
                              : <><User className="h-3 w-3" />OPERATOR</>}
                          </span>
                        </td>
                        <td className="text-xs text-muted-foreground font-mono">
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => toggleRole(u)}
                            disabled={isUpdating || isCurrentUser}
                            title={isCurrentUser ? 'Não é possível alterar seu próprio papel' : undefined}
                            className={cn(
                              'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors',
                              'disabled:opacity-40 disabled:cursor-not-allowed',
                              u.role === 'ADMIN'
                                ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                                : 'border-primary/30 text-primary hover:bg-primary/10'
                            )}
                          >
                            {isUpdating ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : u.role === 'ADMIN' ? (
                              <><ShieldOff className="h-3 w-3" />Rebaixar</>
                            ) : (
                              <><Shield className="h-3 w-3" />Promover</>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
