import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, FileText, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  USER_CREATED: 'Usuário criado',
  USER_UPDATED: 'Usuário atualizado',
  PASSWORD_RESET: 'Senha redefinida',
  ITEM_CREATED: 'Item criado',
  ITEM_UPDATED: 'Item atualizado',
  ITEM_DELETED: 'Item excluído',
  CATEGORY_CREATED: 'Categoria criada',
  CATEGORY_UPDATED: 'Categoria atualizada',
  MOVEMENT_CREATED: 'Movimentação registrada',
};

export default function AuditLogs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (entityFilter) query = query.eq('entity', entityFilter);
      if (actionFilter) query = query.eq('action', actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data ?? []) as unknown as AuditLog[]);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [entityFilter, actionFilter]);

  useEffect(() => {
    if (isAdmin) loadLogs();
  }, [isAdmin, loadLogs]);

  const entities = [...new Set(logs.map(l => l.entity))];
  const actions = [...new Set(logs.map(l => l.action))];

  return (
    <AppLayout title="Logs de Auditoria">
      <div className="space-y-6">
        <div className="page-header flex-row items-center justify-between">
          <div>
            <h2 className="page-title">Logs de Auditoria</h2>
            <p className="page-subtitle">Histórico completo de ações do sistema</p>
          </div>
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="flex items-center gap-2 h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Atualizar
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="input-search h-8 w-40 text-xs"
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
          >
            <option value="">Todas entidades</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select
            className="input-search h-8 w-48 text-xs"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          >
            <option value="">Todas ações</option>
            {actions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
          </select>
        </div>

        <div className="stat-card p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Usuário</th>
                    <th>Ação</th>
                    <th>Entidade</th>
                    <th>ID Registro</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <div>
                          <p className="text-sm font-medium">{l.user_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{l.user_email}</p>
                        </div>
                      </td>
                      <td>
                        <span className="badge-operator text-xs">
                          {ACTION_LABELS[l.action] ?? l.action}
                        </span>
                      </td>
                      <td className="text-sm text-muted-foreground">{l.entity}</td>
                      <td className="text-xs font-mono text-muted-foreground">{l.entity_id ?? '—'}</td>
                      <td className="text-xs text-muted-foreground max-w-xs truncate">
                        {l.details ? JSON.stringify(l.details) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
