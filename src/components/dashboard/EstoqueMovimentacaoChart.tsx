import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Filter, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useItems } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { useMovimentacaoEstoque } from '@/hooks/useMovimentacaoEstoque';
import type { MovimentacaoFiltros } from '@/types/estoque';

export function EstoqueMovimentacaoChart() {
  // Filtros locais (pendentes de aplicação)
  const [itemId, setItemId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Filtros aplicados (usados na query)
  const [applied, setApplied] = useState<MovimentacaoFiltros>({});

  const { data: items = [] } = useItems();
  const { data: categories = [] } = useCategories();

  const activeItems = useMemo(() => items.filter(i => i.active), [items]);
  const activeCategories = useMemo(() => categories.filter(c => c.active), [categories]);

  const { data: chartData, isLoading, isError } = useMovimentacaoEstoque(applied);

  const handleApply = () => {
    setApplied({
      itemId: itemId || undefined,
      categoryId: !itemId && categoryId ? categoryId : undefined,
      startDate,
      endDate,
    });
  };

  return (
    <Card className="stat-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Movimentação de Estoque
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Item */}
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground">Item</label>
            <Select value={itemId} onValueChange={v => { setItemId(v === '__all__' ? '' : v); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {activeItems.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground">Categoria</label>
            <Select
              value={categoryId}
              onValueChange={v => { setCategoryId(v === '__all__' ? '' : v); }}
              disabled={!!itemId}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={itemId ? 'Ignorado' : 'Todas'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {activeCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data início */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1 min-w-[120px] justify-start', !startDate && 'text-muted-foreground')}>
                  <CalendarIcon className="h-3 w-3" />
                  {startDate ? format(startDate, 'dd/MM/yyyy') : 'Início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data fim */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1 min-w-[120px] justify-start', !endDate && 'text-muted-foreground')}>
                  <CalendarIcon className="h-3 w-3" />
                  {endDate ? format(endDate, 'dd/MM/yyyy') : 'Fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <Button size="sm" className="h-8 text-xs gap-1" onClick={handleApply}>
            <Filter className="h-3 w-3" />
            Aplicar Filtro
          </Button>
        </div>

        {/* Gráfico */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-8">Erro ao carregar movimentações.</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação encontrada para os filtros selecionados.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
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
              <Line type="monotone" dataKey="entradas" name="Entradas" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="saidas" name="Saídas" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(199 89% 48%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
