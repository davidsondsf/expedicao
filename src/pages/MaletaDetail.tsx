import { AppLayout } from '@/components/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useMaleta, useReturnMaleta } from '@/hooks/useMaletas';
import { useItemMovements } from '@/hooks/useMovements';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabel: Record<string, { label: string; className: string }> = {
  aberta: { label: 'Aberta', className: 'badge-entry' },
  devolvida: { label: 'Devolvida', className: 'bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full' },
  atrasada: { label: 'Atrasada', className: 'badge-exit' },
};

export default function MaletaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const { data: maleta, isLoading } = useMaleta(id ?? '');
  const returnMaleta = useReturnMaleta();
  const canReturn = can('canCreateMovements');

  const handleReturn = async () => {
    if (!user || !id) return;
    try {
      await returnMaleta.mutateAsync({ maletaId: id, userId: user.id });
      toast({ title: 'Devolução registrada com sucesso!' });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao registrar devolução', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Maleta Técnica">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!maleta) {
    return (
      <AppLayout title="Maleta Técnica">
        <p className="text-muted-foreground text-center py-20">Maleta não encontrada.</p>
      </AppLayout>
    );
  }

  const cfg = statusLabel[maleta.status] ?? statusLabel.aberta;

  return (
    <AppLayout title="Detalhe da Maleta">
      <div className="space-y-6">
        <button onClick={() => navigate('/maletas')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="page-title">Maleta Técnica</h2>
            <p className="text-xs text-muted-foreground font-mono">{maleta.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cfg.className}>{cfg.label}</span>
            {canReturn && maleta.status !== 'devolvida' && (
              <button
                onClick={handleReturn}
                disabled={returnMaleta.isPending}
                className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Registrar Devolução
              </button>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card space-y-3">
            <h3 className="text-sm font-semibold">Dados do Empréstimo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usuário</span>
                <span className="font-medium">{maleta.usuarioNome ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{maleta.usuarioEmail ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado por</span>
                <span>{maleta.criadoPorNome ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data do empréstimo</span>
                <span className="font-mono">{new Date(maleta.dataEmprestimo).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Devolução prevista</span>
                <span className="font-mono">{new Date(maleta.dataPrevistaDevolucao).toLocaleDateString('pt-BR')}</span>
              </div>
              {maleta.dataDevolucao && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Devolvida em</span>
                  <span className="font-mono">{new Date(maleta.dataDevolucao).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {maleta.observacoes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground text-xs mb-1">Observações</p>
                  <p className="text-sm">{maleta.observacoes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold mb-3">Itens Emprestados</h3>
            <div className="space-y-2">
              {(maleta.itens ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item registrado.</p>
              ) : (
                maleta.itens!.map(item => (
                  <div key={item.id} className="rounded-md border border-border/50 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.itemNome}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.itemBrand} — {item.itemModel}
                        </p>
                        {item.numeroSerie && (
                          <p className="text-xs font-mono text-muted-foreground">S/N: {item.numeroSerie}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold font-mono shrink-0">×{item.quantidade}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
