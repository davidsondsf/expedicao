import { AppLayout } from '@/components/AppLayout';
import { Package, Tag, ArrowLeftRight, AlertTriangle, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useItems } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { useMovements } from '@/hooks/useMovements';
import { useMemo } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: items = [], isLoading: loadingItems } = useItems();
  const { data: categories = [] } = useCategories();
  const { data: movements = [], isLoading: loadingMovements } = useMovements();

  const activeItems = items.filter(i => i.active);
  const activeCategories = categories.filter(c => c.active);
  const lowStockItems = activeItems.filter(i => i.quantity <= i.minQuantity);

  // Build chart data from real movements (last 30 days)
  const chartData = useMemo(() => {
    const days: { date: string; entries: number; exits: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const dayStr = d.toISOString().split('T')[0];
      const dayMovements = movements.filter(m => m.createdAt.startsWith(dayStr));
      days.push({
        date: label,
        entries: dayMovements.filter(m => m.type === 'ENTRY').reduce((s, m) => s + m.quantity, 0),
        exits: dayMovements.filter(m => m.type === 'EXIT').reduce((s, m) => s + m.quantity, 0),
      });
    }
    return days.filter((_, i) => i % 3 === 0);
  }, [movements]);

  const stats = [
    { label: 'Itens Cadastrados', value: activeItems.length, icon: Package, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Categorias Ativas', value: activeCategories.length, icon: Tag, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Movimentações', value: movements.length, icon: ArrowLeftRight, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Estoque Baixo', value: lowStockItems.length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  const recentMovements = movements.slice(0, 10);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="page-header">
          <h2 className="page-title">
            Olá, {user?.name.split(' ')[0]} 👋
          </h2>
          <p className="page-subtitle">Resumo do estoque — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  {loadingItems ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground">{value}</p>
                  )}
                </div>
                <div className={cn('rounded-md p-2', bg)}>
                  <Icon className={cn('h-5 w-5', color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart + Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2 stat-card">
            <h3 className="text-sm font-semibold mb-4">Entradas vs Saídas — últimos 30 dias</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="entries" name="Entradas" stroke="hsl(142 71% 45%)" fill="url(#colorEntry)" strokeWidth={2} />
                <Area type="monotone" dataKey="exits" name="Saídas" stroke="hsl(0 72% 51%)" fill="url(#colorExit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Low stock */}
          <div className="stat-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Estoque Crítico
            </h3>
            <div className="space-y-2">
              {loadingItems ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
              ) : lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item em estoque crítico.</p>
              ) : lowStockItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/items/${item.id}`)}
                  className="w-full text-left rounded-md border border-border/50 p-2.5 hover:border-destructive/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-destructive">{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">/ {item.minQuantity}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Movements */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4">Últimas Movimentações</h3>
          {loadingMovements ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Item</th>
                    <th>Qtd</th>
                    <th>Responsável</th>
                    <th>Nota</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                        Nenhuma movimentação registrada.
                      </td>
                    </tr>
                  )}
                  {recentMovements.map(mov => (
                    <tr key={mov.id}>
                      <td>
                        <span className={mov.type === 'ENTRY' ? 'badge-entry' : 'badge-exit'}>
                          {mov.type === 'ENTRY' ? (
                            <><TrendingUp className="h-3 w-3 mr-1" />Entrada</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 mr-1" />Saída</>
                          )}
                        </span>
                      </td>
                      <td className="text-sm">{mov.item?.name}</td>
                      <td className="font-mono text-sm font-semibold">{mov.quantity}</td>
                      <td className="text-sm text-muted-foreground">{mov.user?.name}</td>
                      <td className="text-sm text-muted-foreground max-w-[200px] truncate">{mov.note || '-'}</td>
                      <td className="text-xs text-muted-foreground font-mono">
                        {new Date(mov.createdAt).toLocaleDateString('pt-BR')}
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
