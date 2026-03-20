import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import type { MovementType } from '@/types';
import { TrendingUp, TrendingDown, Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMovements, useCreateMovement } from '@/hooks/useMovements';
import { useItems, useUpdateItem } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useItemPhotoUpload } from '@/hooks/useItemPhotoUpload';
import { MovementDialog, type MovementFormData } from '@/components/MovementDialog';

export default function Movements() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | 'ALL'>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { canCreateMovements } = usePermissions();
  const { toast } = useToast();

  const { data: movements = [], isLoading } = useMovements();
  const { data: items = [] } = useItems();
  const { data: categories = [] } = useCategories();
  const createMovement = useCreateMovement();
  const updateItem = useUpdateItem();
  const { uploadPhoto } = useItemPhotoUpload();

  const filtered = movements.filter(m => {
    const matchSearch = m.item?.name.toLowerCase().includes(search.toLowerCase()) ?? false;
    const matchType = typeFilter === 'ALL' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleSave = async (data: MovementFormData, photoFile?: File | null) => {
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

      // Update item metadata (photo, condition, serial, location)
      const itemUpdate: Record<string, unknown> = { id: data.itemId };
      let hasUpdate = false;

      if (data.condition) { itemUpdate.condition = data.condition; hasUpdate = true; }
      if (data.serialNumber !== undefined && data.serialNumber !== item.serialNumber) { itemUpdate.serialNumber = data.serialNumber; hasUpdate = true; }
      if (data.location !== undefined && data.location !== item.location) { itemUpdate.location = data.location; hasUpdate = true; }

      if (photoFile) {
        const url = await uploadPhoto(photoFile, data.itemId);
        if (url) { itemUpdate.photoUrl = url; hasUpdate = true; }
      }

      if (hasUpdate) {
        await updateItem.mutateAsync(itemUpdate as any);
      }

      setDialogOpen(false);
      toast({ title: 'Movimentação registrada com sucesso!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar movimentação';
      toast({ title: msg, variant: 'destructive' });
    }
  };

  const activeItems = items.filter(i => i.active).map(i => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    photoUrl: i.photoUrl,
    condition: i.condition,
    serialNumber: i.serialNumber,
    location: i.location,
    requiresSerialNumber: i.requiresSerialNumber,
    allowBulkMovement: i.allowBulkMovement,
  }));

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
            disabled={!canCreateMovements}
            className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Nova Movimentação
          </button>
        </div>

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
                      <span className="truncate block">{mov.note || '-'}</span>
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

      {canCreateMovements && (
        <MovementDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          items={activeItems}
          loading={createMovement.isPending}
        />
      )}
    </AppLayout>
  );
}
