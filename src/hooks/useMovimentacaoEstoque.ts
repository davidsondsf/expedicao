import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getMovimentacaoEstoque } from '@/services/estoqueService';
import type { MovimentacaoEstoque, MovimentacaoFiltros } from '@/types/estoque';

/**
 * Hook que busca movimentações e calcula entradas, saídas e saldo acumulado por dia.
 *
 * Lógica do saldo:
 * 1. Agrupa movimentações por dia (YYYY-MM-DD).
 * 2. Para cada dia, soma entradas e saídas separadamente.
 * 3. Calcula saldo progressivo: saldo[i] = saldo[i-1] + entradas[i] - saidas[i]
 */
export function useMovimentacaoEstoque(filtros: MovimentacaoFiltros) {
  const queryResult = useQuery({
    queryKey: ['movimentacao-estoque', filtros],
    queryFn: () => getMovimentacaoEstoque(filtros),
  });

  const chartData = useMemo<MovimentacaoEstoque[]>(() => {
    const rows = queryResult.data;
    if (!rows || rows.length === 0) return [];

    // Agrupar por dia
    const byDay = new Map<string, { entradas: number; saidas: number }>();

    for (const row of rows) {
      const day = row.created_at.split('T')[0];
      const current = byDay.get(day) ?? { entradas: 0, saidas: 0 };
      if (row.type === 'ENTRY') {
        current.entradas += row.quantity;
      } else {
        current.saidas += row.quantity;
      }
      byDay.set(day, current);
    }

    // Ordenar dias e calcular saldo acumulado
    const sortedDays = Array.from(byDay.keys()).sort();
    let saldoAcumulado = 0;

    return sortedDays.map(day => {
      const { entradas, saidas } = byDay.get(day)!;
      // Saldo progressivo: saldo anterior + entradas do dia - saídas do dia
      saldoAcumulado = saldoAcumulado + entradas - saidas;

      const [, mm, dd] = day.split('-');
      return {
        data: day,
        label: `${dd}/${mm}`,
        entradas,
        saidas,
        saldo: saldoAcumulado,
      };
    });
  }, [queryResult.data]);

  return {
    data: chartData,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
  };
}
