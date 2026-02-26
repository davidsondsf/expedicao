import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Plus, Search, Briefcase, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useMaletas, useReturnMaleta } from '@/hooks/useMaletas';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import type { MaletaStatus } from '@/types/maleta';

const statusConfig: Record<MaletaStatus, { label: string; className: string }> = {
  aberta: { label: 'Aberta', className: 'badge-entry' },
  devolvida: { label: 'Devolvida', className: 'bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full' },
  atrasada: { label: 'Atrasada', className: 'badge-exit' },
};

export default function Maletas() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();

  const { data: maletas = [], isLoading } = useMaletas();
  const returnMaleta = useReturnMaleta();

  const canCreate = can('canCreateMovements');

  const filtered = maletas.filter(m => {
    const matchSearch =
      (m.usuarioNome?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleReturn = async (maletaId: string) => {
    if (!user) return;
    try {
      await returnMaleta.mutateAsync({ maletaId, userId: user.id });
      toast({ title: 'Devolução registrada com sucesso!' });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao registrar devolução', variant: 'destructive' });
    }
  };

  return (
    <AppLayout title="Maleta Técnica">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="page-header mb-0">
            <h2 className="page-title">Maletas Técnicas</h2>
            <p className="page-subtitle">{filtered.length} maletas encontradas</p>
          </div>
          {canCreate && (
            <button
              onClick={() => navigate('/maletas/new')}
              className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Nova Maleta
            </button>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="input-search pl-8 h-9 w-full"
              placeholder="Buscar por usuário ou ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-search h-9 w-auto"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="aberta">Aberta</option>
            <option value="atrasada">Atrasada</option>
            <option value="devolvida">Devolvida</option>
          </select>
        </div>

        <div className="stat-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Data Empréstimo</th>
                  <th>Previsão Devolução</th>
                  <th>Status</th>
                  <th className="text-right pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-40" />
                      Carregando maletas...
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Nenhuma maleta encontrada
                    </td>
                  </tr>
                )}
                {filtered.map(m => {
                  const cfg = statusConfig[m.status];
                  return (
                    <tr key={m.id}>
                      <td>
                        <div>
                          <p className="text-sm font-medium">{m.usuarioNome ?? 'Desconhecido'}</p>
                          <p className="text-xs text-muted-foreground">{m.usuarioEmail}</p>
                        </div>
                      </td>
                      <td className="text-xs text-muted-foreground font-mono">
                        {new Date(m.dataEmprestimo).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="text-xs text-muted-foreground font-mono">
                        {new Date(m.dataPrevistaDevolucao).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        <span className={cfg.className}>{cfg.label}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 pr-2">
                          <button
                            onClick={() => navigate(`/maletas/${m.id}`)}
                            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canCreate && m.status !== 'devolvida' && (
                            <button
                              onClick={() => handleReturn(m.id)}
                              disabled={returnMaleta.isPending}
                              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                              title="Registrar devolução"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
