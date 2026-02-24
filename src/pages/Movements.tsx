import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import type { MovementType } from '@/types';
import { TrendingUp, TrendingDown, Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useMovements, useCreateMovement } from '@/hooks/useMovements';
import { useItems } from '@/hooks/useItems';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  type: z.enum(['ENTRY', 'EXIT']),
  itemId: z.string().min(1, 'Selecione um item'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser maior que 0'),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function MovementDialog({
  open, onClose, onSave, items, loading,
}: {
  open: boolean; onClose: () => void;
  onSave: (d: FormData) => Promise<void>;
  items: { id: string; name: string; quantity: number }[];
  loading: boolean;
}) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ENTRY', quantity: 1 },
  });

  const handleClose = () => { reset(); onClose(); };

  if (!open) return null;

  const type = watch('type');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-card shadow-lg animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">Registrar Movimentação</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ENTRY', 'EXIT'] as MovementType[]).map(t => (
                <label key={t} className={cn(
                  'flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors',
                  type === t
                    ? t === 'ENTRY' ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10'
                    : 'border-border hover:bg-muted'
                )}>
                  <input {...register('type')} type="radio" value={t} className="sr-only" />
                  {t === 'ENTRY' ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                  <span className="text-sm font-medium">{t === 'ENTRY' ? 'Entrada' : 'Saída'}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Item *</label>
            <select {...register('itemId')} className="input-search h-9 w-full">
              <option value="">Selecionar item...</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name} (estoque: {i.quantity})</option>
              ))}
            </select>
            {errors.itemId && <p className="mt-0.5 text-xs text-destructive">{errors.itemId.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Quantidade *</label>
            <input {...register('quantity')} type="number" min={1} className="input-search h-9 w-full" />
            {errors.quantity && <p className="mt-0.5 text-xs text-destructive">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Observação</label>
            <textarea {...register('note')} className="input-search w-full h-20 py-2 resize-none" placeholder="Motivo ou observação..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Movements() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | 'ALL'>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: movements = [], isLoading } = useMovements();
  const { data: items = [] } = useItems();
  const createMovement = useCreateMovement();

  const filtered = movements.filter(m => {
    const matchSearch = m.item?.name.toLowerCase().includes(search.toLowerCase()) ?? false;
    const matchType = typeFilter === 'ALL' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleSave = async (data: FormData) => {
    const item = items.find(i => i.id === data.itemId);
    if (!item) return;

    try {
      await createMovement.mutateAsync({
        type: data.type,
        quantity: data.quantity,
        itemId: data.itemId,
        userId: user?.id ?? '',
        note: data.note,
      });
      setDialogOpen(false);
      toast({ title: 'Movimentação registrada com sucesso!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar movimentação';
      toast({ title: msg, variant: 'destructive' });
    }
  };

  const activeItems = items.filter(i => i.active);

  return (
    <AppLayout title="Movimentações">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="page-header mb-0">
            <h2 className="page-title">Movimentações</h2>
            <p className="page-subtitle">{filtered.length} registros</p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Nova Movimentação
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: movements.length, className: '' },
            { label: 'Entradas', value: movements.filter(m => m.type === 'ENTRY').length, className: 'text-success' },
            { label: 'Saídas', value: movements.filter(m => m.type === 'EXIT').length, className: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-3">
              <p className={cn('text-2xl font-bold', s.className)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="input-search pl-8 h-9 w-full"
              placeholder="Buscar por item..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(['ALL', 'ENTRY', 'EXIT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'px-3 h-7 rounded text-xs font-medium transition-colors',
                  typeFilter === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'ALL' ? 'Todos' : t === 'ENTRY' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="stat-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Item</th>
                  <th>Qtd</th>
                  <th>Responsável</th>
                  <th>Observação</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-40" />
                      Carregando...
                    </td>
                  </tr>
                )}
                {filtered.map(mov => (
                  <tr key={mov.id}>
                    <td>
                      <span className={mov.type === 'ENTRY' ? 'badge-entry' : 'badge-exit'}>
                        {mov.type === 'ENTRY'
                          ? <><TrendingUp className="h-3 w-3 mr-1 inline" />Entrada</>
                          : <><TrendingDown className="h-3 w-3 mr-1 inline" />Saída</>
                        }
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm font-medium">{mov.item?.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{mov.item?.barcode}</p>
                      </div>
                    </td>
                    <td className="font-mono text-sm font-bold">{mov.quantity}</td>
                    <td className="text-sm text-muted-foreground">{mov.user?.name}</td>
                    <td className="text-sm text-muted-foreground max-w-[200px]">
                      <span className="truncate block">{mov.note || '—'}</span>
                    </td>
                    <td className="text-xs font-mono text-muted-foreground">
                      {new Date(mov.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhuma movimentação encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <MovementDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        items={activeItems}
        loading={createMovement.isPending}
      />
    </AppLayout>
  );
}
