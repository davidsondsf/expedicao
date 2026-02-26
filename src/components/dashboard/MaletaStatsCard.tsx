import { Briefcase, AlertTriangle, Package } from 'lucide-react';
import { useMaletaStats } from '@/hooks/useMaletas';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MaletaStatsCard() {
  const { data: stats, isLoading } = useMaletaStats();

  const cards = [
    { label: 'Maletas Abertas', value: stats?.abertas ?? 0, icon: Briefcase, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Maletas Atrasadas', value: stats?.atrasadas ?? 0, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Itens Emprestados', value: stats?.itensEmprestados ?? 0, icon: Package, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="stat-card">
      <h3 className="text-sm font-semibold mb-4">Maletas Técnicas</h3>
      <div className="grid grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="text-center">
            <div className={cn('rounded-md p-2 inline-flex mb-2', bg)}>
              <Icon className={cn('h-5 w-5', color)} />
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
