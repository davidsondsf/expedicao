/** Dados agrupados por dia para o gráfico de movimentação de estoque */
export interface MovimentacaoEstoque {
  /** Data no formato YYYY-MM-DD */
  data: string;
  /** Label formatado para exibição (DD/MM) */
  label: string;
  /** Total de entradas no dia */
  entradas: number;
  /** Total de saídas no dia */
  saidas: number;
  /** Saldo acumulado: saldo_anterior + entradas - saídas */
  saldo: number;
}

export interface MovimentacaoFiltros {
  itemId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
}
