import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAdminUsers, type ManagedUser } from '@/hooks/useAdminUsers';
import { UserFormDialog, type UserFormData } from '@/components/UserFormDialog';
import { ResetPasswordDialog } from '@/components/ResetPasswordDialog';
import {
  Shield, User, RefreshCw, AlertTriangle, Plus, Pencil,
  KeyRound, UserCheck, UserX, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, { label: string; class: string }> = {
  ADMIN: { label: 'Admin', class: 'badge-admin' },
  OPERATOR: { label: 'Operador', class: 'badge-operator' },
  VIEWER: { label: 'Visualizador', class: 'badge-warning' },
};

export default function AdminUsers() {
  const { user: currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { users, isLoading, loadUsers, createUser, updateUser, resetPassword } = useAdminUsers();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  const handleCreate = async (data: UserFormData) => {
    await createUser({ name: data.name, email: data.email, password: data.password, role: data.role });
  };

  const handleEdit = async (data: UserFormData) => {
    if (!editingUser) return;
    const changes: Record<string, unknown> = {};
    if (data.name !== editingUser.name) changes.name = data.name;
    if (data.role !== editingUser.role) changes.role = data.role;
    if (Object.keys(changes).length > 0) {
      await updateUser(editingUser.user_id, changes as { name?: string; role?: import('@/types').UserRole });
    }
  };

  const toggleActive = async (u: ManagedUser) => {
    if (u.user_id === currentUser?.id) return;
    await updateUser(u.user_id, { active: !u.active });
  };

  const adminCount = users.filter(u => u.role === 'ADMIN' && u.active).length;

  return (
    <AppLayout title="Administração de Usuários">
      <div className="space-y-6">
        <div className="page-header flex-row items-center justify-between">
          <div>
            <h2 className="page-title">Gerenciar Usuários</h2>
            <p className="page-subtitle">Crie, edite e gerencie os papéis e acessos</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              disabled={isLoading}
              className="flex items-center gap-2 h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Atualizar
            </button>
            <button
              onClick={() => { setEditingUser(null); setFormOpen(true); }}
              className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold text-foreground">{users.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-1">Admins</p>
            <p className="text-3xl font-bold text-primary">{users.filter(u => u.role === 'ADMIN').length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-1">Operadores</p>
            <p className="text-3xl font-bold" style={{ color: 'hsl(var(--info))' }}>{users.filter(u => u.role === 'OPERATOR').length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground mb-1">Visualizadores</p>
            <p className="text-3xl font-bold" style={{ color: 'hsl(var(--warning))' }}>{users.filter(u => u.role === 'VIEWER').length}</p>
          </div>
        </div>

        {adminCount <= 1 && (
          <div className="flex items-start gap-3 rounded-md border px-4 py-3"
            style={{ borderColor: 'hsl(var(--warning) / 0.3)', background: 'hsl(var(--warning) / 0.08)' }}>
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'hsl(var(--warning))' }} />
            <p className="text-sm" style={{ color: 'hsl(var(--warning))' }}>
              Há apenas <strong>{adminCount}</strong> admin ativo. Mantenha pelo menos um.
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
                    <th>Status</th>
                    <th>Cadastro</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isCurrentUser = u.user_id === currentUser?.id;
                    const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS.OPERATOR;
                    return (
                      <tr key={u.user_id} className={cn(!u.active && 'opacity-50')}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {u.role === 'ADMIN' ? <Shield className="h-3.5 w-3.5 text-primary" /> :
                               u.role === 'VIEWER' ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> :
                               <User className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <span className="font-medium text-sm">
                              {u.name}
                              {isCurrentUser && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(você)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm text-muted-foreground font-mono">{u.email}</td>
                        <td>
                          <span className={cn(roleInfo.class)}>{roleInfo.label}</span>
                        </td>
                        <td>
                          <span className={cn(
                            'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium',
                            u.active
                              ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                              : 'bg-destructive/15 text-destructive'
                          )}>
                            {u.active ? <><UserCheck className="h-3 w-3" />Ativo</> : <><UserX className="h-3 w-3" />Inativo</>}
                          </span>
                        </td>
                        <td className="text-xs text-muted-foreground font-mono">
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingUser(u); setFormOpen(true); }}
                              disabled={isCurrentUser}
                              title="Editar"
                              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setResetTarget(u); setResetOpen(true); }}
                              title="Redefinir senha"
                              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => toggleActive(u)}
                              disabled={isCurrentUser}
                              title={u.active ? 'Inativar' : 'Ativar'}
                              className={cn(
                                'h-8 px-2 flex items-center gap-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                                u.active
                                  ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                                  : 'border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)]'
                              )}
                            >
                              {u.active ? <><UserX className="h-3 w-3" />Inativar</> : <><UserCheck className="h-3 w-3" />Ativar</>}
                            </button>
                          </div>
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

      <UserFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingUser(null); }}
        onSubmit={editingUser ? handleEdit : handleCreate}
        user={editingUser}
      />

      <ResetPasswordDialog
        open={resetOpen}
        onClose={() => { setResetOpen(false); setResetTarget(null); }}
        onSubmit={pw => resetPassword(resetTarget!.user_id, pw)}
        userName={resetTarget?.name ?? ''}
      />
    </AppLayout>
  );
}
