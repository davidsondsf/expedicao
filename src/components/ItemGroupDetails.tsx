import { useGroupMovements } from '@/hooks/useMovements';
import { Item } from '@/types';
import { TrendingUp, TrendingDown, Loader2, MapPin, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ItemGroupDetailsProps {
  items: Item[];
  type: 'serial' | 'bulk';
}

export function ItemGroupDetails({ items, type }: ItemGroupDetailsProps) {
  const navigate = useNavigate();
  const itemIds = items.map(i => i.id);
  const { data: movements = [], isLoading } = useGroupMovements(itemIds);

  if (type === 'serial') {
    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.flatMap(item => 
          Array.from({ length: Math.max(1, item.quantity) }).map((_, idx) => (
            <div 
              key={`${item.id}-${idx}`} 
              className={cn(
                "rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between",
                item.quantity === 0 && "opacity-60 grayscale-[0.5]"
              )}
              onClick={() => navigate(`/estoque/${item.id}`)}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-14 h-14 bg-muted/50 rounded-md overflow-hidden flex items-center justify-center border shrink-0">
                   {item.photoUrl ? (
                     <img src={item.photoUrl} alt="Foto do item" className="w-full h-full object-cover" />
                   ) : (
                     <span className="font-mono text-[10px] font-bold text-muted-foreground">
                       {item.serialNumber ? item.serialNumber.slice(-4) : 'S/N'}
                     </span>
                   )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className={cn(
                      'text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm',
                      item.quantity === 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                    )}>
                      {item.quantity === 0 ? 'Saída' : 'No Estoque'}
                    </span>
                    {item.condition && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground border">
                        {item.condition}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate mb-0.5" title={item.serialNumber || 'Não registrado'}>
                    SN: <span className="font-mono text-foreground">{item.serialNumber || 'Ñ Registrado'}</span>
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground truncate" title={item.location}>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.location || 'Sem local'}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar Inside Card */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-auto">
                <p className="text-[10px] text-muted-foreground">
                  Unidade {item.quantity > 0 ? idx + 1 : 0} de {item.quantity}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/estoque/${item.id}`); }}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <History className="h-3 w-3" />
                  Razão
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // Bulk type
  return (
    <div className="p-4 bg-muted/20 border-t border-border/50">
      <h4 className="text-sm font-semibold mb-3">Histórico Consolidado de Movimentações</h4>
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : movements.length === 0 ? (
        <p className="text-sm text-muted-foreground p-2">Nenhuma movimentação registrada para este grupo de itens.</p>
      ) : (
        <div className="space-y-2">
          {movements.map(mov => (
            <div key={mov.id} className="flex items-center justify-between gap-3 rounded-md border border-border/50 p-2.5 bg-background">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                  mov.type === 'ENTRY' ? 'bg-success/10' : 'bg-destructive/10'
                )}>
                  {mov.type === 'ENTRY'
                    ? <TrendingUp className="h-4 w-4 text-success" />
                    : <TrendingDown className="h-4 w-4 text-destructive" />
                  }
                </div>
                <div>
                   <div className="flex items-center gap-2">
                      <span className={mov.type === 'ENTRY' ? 'badge-entry' : 'badge-exit'}>
                        {mov.type === 'ENTRY' ? 'Entrada' : 'Saída'}
                      </span>
                      <span className="font-mono text-sm font-bold">{mov.quantity} un</span>
                    </div>
                    {mov.note && <p className="text-xs text-muted-foreground mt-0.5">{mov.note}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-foreground">{mov.user?.name || 'Sistema'}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {new Date(mov.createdAt).toLocaleDateString('pt-BR')} {new Date(mov.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
