import type { Category, Item, Movement, User, DashboardStats } from '@/types';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export const mockUsers: User[] = [
  { id: 'u1', name: 'Admin Galpão', email: 'admin@galpaocopycentro.com', role: 'ADMIN', active: true, createdAt: daysAgo(90) },
  { id: 'u2', name: 'João Operador', email: 'joao@galpaocopycentro.com', role: 'OPERATOR', active: true, createdAt: daysAgo(60) },
  { id: 'u3', name: 'Maria Silva', email: 'maria@galpaocopycentro.com', role: 'OPERATOR', active: true, createdAt: daysAgo(30) },
];

export const mockCategories: Category[] = [
  { id: 'c1', name: 'Papéis e Mídias', active: true, createdAt: daysAgo(80), itemCount: 12 },
  { id: 'c2', name: 'Toners e Cartuchos', active: true, createdAt: daysAgo(75), itemCount: 8 },
  { id: 'c3', name: 'Peças de Reposição', active: true, createdAt: daysAgo(60), itemCount: 5 },
  { id: 'c4', name: 'Equipamentos', active: true, createdAt: daysAgo(45), itemCount: 3 },
  { id: 'c5', name: 'Embalagens', active: false, createdAt: daysAgo(120), itemCount: 0 },
];

export const mockItems: Item[] = [
  {
    id: 'i1', name: 'Papel A4 75g', brand: 'Report', model: 'Premium Branco', serialNumber: undefined,
    quantity: 45, minQuantity: 20, location: 'Prateleira A1', barcode: 'GCP-2024-00001',
    categoryId: 'c1', active: true, createdAt: daysAgo(60), updatedAt: daysAgo(2),
    category: { id: 'c1', name: 'Papéis e Mídias', active: true, createdAt: daysAgo(80) },
  },
  {
    id: 'i2', name: 'Toner HP LaserJet', brand: 'HP', model: 'CF280A', serialNumber: 'HP-TN-00123',
    quantity: 3, minQuantity: 5, location: 'Prateleira B2', barcode: 'GCP-2024-00002',
    categoryId: 'c2', active: true, createdAt: daysAgo(45), updatedAt: daysAgo(1),
    category: { id: 'c2', name: 'Toners e Cartuchos', active: true, createdAt: daysAgo(75) },
  },
  {
    id: 'i3', name: 'Cartucho Epson L3150', brand: 'Epson', model: 'T544120-AL', serialNumber: undefined,
    quantity: 12, minQuantity: 8, location: 'Prateleira B3', barcode: 'GCP-2024-00003',
    categoryId: 'c2', active: true, createdAt: daysAgo(40), updatedAt: daysAgo(3),
    category: { id: 'c2', name: 'Toners e Cartuchos', active: true, createdAt: daysAgo(75) },
  },
  {
    id: 'i4', name: 'Drum Unit Canon', brand: 'Canon', model: 'C-EXV29', serialNumber: 'CN-DR-44521',
    quantity: 2, minQuantity: 3, location: 'Prateleira C1', barcode: 'GCP-2024-00004',
    categoryId: 'c3', active: true, createdAt: daysAgo(30), updatedAt: daysAgo(5),
    category: { id: 'c3', name: 'Peças de Reposição', active: true, createdAt: daysAgo(60) },
  },
  {
    id: 'i5', name: 'Impressora Xerox WorkCentre', brand: 'Xerox', model: 'WC7225', serialNumber: 'XR-WC-77821',
    quantity: 1, minQuantity: 1, location: 'Área Técnica D1', barcode: 'GCP-2024-00005',
    categoryId: 'c4', active: true, createdAt: daysAgo(90), updatedAt: daysAgo(10),
    category: { id: 'c4', name: 'Equipamentos', active: true, createdAt: daysAgo(45) },
  },
  {
    id: 'i6', name: 'Papel Foto Glossy A4', brand: 'Glossy', model: '180g Premium', serialNumber: undefined,
    quantity: 200, minQuantity: 50, location: 'Prateleira A2', barcode: 'GCP-2024-00006',
    categoryId: 'c1', active: true, createdAt: daysAgo(20), updatedAt: daysAgo(1),
    category: { id: 'c1', name: 'Papéis e Mídias', active: true, createdAt: daysAgo(80) },
  },
  {
    id: 'i7', name: 'Fusível HP M402', brand: 'HP', model: 'RM2-5425', serialNumber: 'HP-FS-09871',
    quantity: 0, minQuantity: 2, location: 'Prateleira C2', barcode: 'GCP-2024-00007',
    categoryId: 'c3', active: true, createdAt: daysAgo(15), updatedAt: daysAgo(2),
    category: { id: 'c3', name: 'Peças de Reposição', active: true, createdAt: daysAgo(60) },
  },
];

export const mockMovements: Movement[] = [
  {
    id: 'm1', type: 'ENTRY', quantity: 50, itemId: 'i1', userId: 'u1',
    note: 'Compra mensal de papéis', createdAt: daysAgo(1),
    item: mockItems[0], user: mockUsers[0],
  },
  {
    id: 'm2', type: 'EXIT', quantity: 2, itemId: 'i2', userId: 'u2',
    note: 'Saída para manutenção impressora sala 3', createdAt: daysAgo(1),
    item: mockItems[1], user: mockUsers[1],
  },
  {
    id: 'm3', type: 'ENTRY', quantity: 10, itemId: 'i3', userId: 'u1',
    note: 'Reposição estoque', createdAt: daysAgo(2),
    item: mockItems[2], user: mockUsers[0],
  },
  {
    id: 'm4', type: 'EXIT', quantity: 1, itemId: 'i4', userId: 'u2',
    note: 'Troca drum impressora sala 5', createdAt: daysAgo(3),
    item: mockItems[3], user: mockUsers[1],
  },
  {
    id: 'm5', type: 'EXIT', quantity: 30, itemId: 'i1', userId: 'u3',
    note: 'Uso interno setor administrativo', createdAt: daysAgo(4),
    item: mockItems[0], user: mockUsers[2],
  },
  {
    id: 'm6', type: 'ENTRY', quantity: 5, itemId: 'i2', userId: 'u1',
    note: 'Compra emergencial toners', createdAt: daysAgo(5),
    item: mockItems[1], user: mockUsers[0],
  },
  {
    id: 'm7', type: 'EXIT', quantity: 100, itemId: 'i6', userId: 'u3',
    note: 'Uso em trabalho fotográfico cliente X', createdAt: daysAgo(6),
    item: mockItems[5], user: mockUsers[2],
  },
  {
    id: 'm8', type: 'ENTRY', quantity: 3, itemId: 'i7', userId: 'u1',
    note: 'Compra peças reposição HP', createdAt: daysAgo(7),
    item: mockItems[6], user: mockUsers[0],
  },
  {
    id: 'm9', type: 'EXIT', quantity: 3, itemId: 'i7', userId: 'u2',
    note: 'Uso manutenção batch printers', createdAt: daysAgo(8),
    item: mockItems[6], user: mockUsers[1],
  },
  {
    id: 'm10', type: 'ENTRY', quantity: 200, itemId: 'i6', userId: 'u1',
    note: 'Reposição estoque foto', createdAt: daysAgo(10),
    item: mockItems[5], user: mockUsers[0],
  },
];

function generateChartData() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    data.push({
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      entries: Math.floor(Math.random() * 80) + 10,
      exits: Math.floor(Math.random() * 60) + 5,
    });
  }
  return data;
}

export const mockDashboard: DashboardStats = {
  totalItems: mockItems.filter(i => i.active).length,
  totalCategories: mockCategories.filter(c => c.active).length,
  totalMovements: mockMovements.length,
  lowStockItems: mockItems.filter(i => i.active && i.quantity <= i.minQuantity),
  recentMovements: mockMovements.slice(0, 10),
  chartData: generateChartData(),
};
