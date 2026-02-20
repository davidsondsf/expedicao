import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { mockItems, mockMovements } from '@/data/mockData';
import Barcode from 'react-barcode';
import { ArrowLeft, TrendingUp, TrendingDown, Package, MapPin, Tag, Hash, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ItemCondition } from '@/types';

const CONDITION_MAP: Record<ItemCondition, { label: string; cls: string }> = {
  new:     { label: 'Novo',       cls: 'bg-success/10 text-success border border-success/30' },
  good:    { label: 'Bom',        cls: 'bg-primary/10 text-primary border border-primary/30' },
  fair:    { label: 'Regular',    cls: 'bg-warning/10 text-warning border border-warning/30' },
  poor:    { label: 'Ruim',       cls: 'bg-orange-400/10 text-orange-400 border border-orange-400/30' },
  damaged: { label: 'Danificado', cls: 'bg-destructive/10 text-destructive border border-destructive/30' },
};

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const item = mockItems.find(i => i.id === id);
  const movements = mockMovements.filter(m => m.itemId === id);

  if (!item) {
    return (
      <AppLayout title="Item não encontrado">
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Item não encontrado.</p>
          <button onClick={() => navigate('/items')} className="mt-4 text-sm text-primary hover:underline">
            Voltar para Itens
          </button>
        </div>
      </AppLayout>
    );
  }

  const stockStatus = item.quantity === 0 ? 'Sem Estoque' :
    item.quantity <= item.minQuantity ? 'Estoque Baixo' : 'OK';

  const conditionInfo = item.condition ? CONDITION_MAP[item.condition] : null;

  return (
    <AppLayout title={`Item: ${item.name}`}>
      <div className="space-y-5 max-w-4xl">
        <button
          onClick={() => navigate('/items')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Itens
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="stat-card">
              <div className="flex items-start gap-4 mb-4">
                {/* Foto */}
                <div className="w-20 h-20 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h2 className="text-xl font-bold">{item.name}</h2>
                      <p className="text-sm text-muted-foreground">{item.brand} — {item.model}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {conditionInfo && (
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', conditionInfo.cls)}>
                          {conditionInfo.label}
                        </span>
                      )}
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        item.quantity === 0 ? 'badge-exit' :
                          item.quantity <= item.minQuantity ? 'badge-warning' : 'badge-entry'
                      )}>
                        {stockStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { icon: Package, label: 'Quantidade', value: `${item.quantity} un`, highlight: true },
                  { icon: Package, label: 'Mínimo', value: `${item.minQuantity} un` },
                  { icon: MapPin, label: 'Localização', value: item.location },
                  { icon: Tag, label: 'Categoria', value: item.category?.name || '-' },
                  { icon: Hash, label: 'Serial', value: item.serialNumber || 'N/A' },
                ].map(({ icon: Icon, label, value, highlight }) => (
                  <div key={label} className="rounded-md border border-border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <p className={cn(
                      'text-sm font-semibold',
                      highlight && item.quantity <= item.minQuantity ? 'text-warning' : ''
                    )}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Criado: {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                <span>Atualizado: {new Date(item.updatedAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Movement history */}
            <div className="stat-card">
              <h3 className="text-sm font-semibold mb-4">Histórico de Movimentações</h3>
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-2">
                  {movements.map(mov => (
                    <div key={mov.id} className="flex items-center gap-3 rounded-md border border-border/50 p-3">
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                        mov.type === 'ENTRY' ? 'bg-success/10' : 'bg-destructive/10'
                      )}>
                        {mov.type === 'ENTRY'
                          ? <TrendingUp className="h-4 w-4 text-success" />
                          : <TrendingDown className="h-4 w-4 text-destructive" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={mov.type === 'ENTRY' ? 'badge-entry' : 'badge-exit'}>
                            {mov.type === 'ENTRY' ? 'Entrada' : 'Saída'}
                          </span>
                          <span className="font-mono text-sm font-bold">{mov.quantity} un</span>
                        </div>
                        {mov.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{mov.note}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{mov.user?.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {new Date(mov.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Barcode panel */}
          <div className="stat-card flex flex-col items-center gap-4">
            <h3 className="text-sm font-semibold w-full">Código de Barras</h3>
            <div className="bg-white rounded-md p-4 flex items-center justify-center">
              <Barcode
                value={item.barcode}
                format="CODE128"
                width={1.5}
                height={70}
                fontSize={11}
                background="#ffffff"
                lineColor="#000000"
                margin={4}
              />
            </div>
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-1">Código</p>
              <p className="font-mono text-sm font-semibold text-primary">{item.barcode}</p>
            </div>
            <div className="w-full rounded-md border border-border p-3 mt-2">
              <p className="text-xs text-muted-foreground mb-1">Simular leitura</p>
              <input
                className="input-search h-8 w-full font-mono text-xs"
                placeholder="Escaneie ou digite o código..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    const found = mockItems.find(i => i.barcode === val);
                    if (found) navigate(`/items/${found.id}`);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">Pressione Enter para buscar</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
