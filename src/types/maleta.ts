export type MaletaStatus = 'aberta' | 'devolvida' | 'atrasada';

export interface MaletaTecnica {
  id: string;
  usuarioId: string;
  usuarioNome?: string;
  usuarioEmail?: string;
  dataEmprestimo: string;
  dataPrevistaDevolucao: string;
  dataDevolucao?: string;
  status: MaletaStatus;
  observacoes?: string;
  criadoPor: string;
  criadoPorNome?: string;
  createdAt: string;
  updatedAt: string;
  itens?: MaletaItem[];
}

export interface MaletaItem {
  id: string;
  maletaId: string;
  itemId: string;
  quantidade: number;
  numeroSerie?: string;
  createdAt: string;
  itemNome?: string;
  itemBarcode?: string;
  itemBrand?: string;
  itemModel?: string;
}

export interface CreateMaletaInput {
  usuarioId: string;
  dataPrevistaDevolucao: string;
  observacoes?: string;
  itens: { item_id: string; quantidade: number; numero_serie?: string }[];
}
