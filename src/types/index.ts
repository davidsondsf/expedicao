export type UserRole = 'ADMIN' | 'OPERATOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthUser extends User {
  token: string;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  itemCount?: number;
}

export interface Item {
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  minQuantity: number;
  location: string;
  barcode: string;
  categoryId: string;
  category?: Category;
  active: boolean;
  condition?: ItemCondition;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ItemCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';

export type MovementType = 'ENTRY' | 'EXIT';

export interface Movement {
  id: string;
  type: MovementType;
  quantity: number;
  itemId: string;
  item?: Item;
  userId: string;
  user?: User;
  note?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalItems: number;
  totalCategories: number;
  totalMovements: number;
  lowStockItems: Item[];
  recentMovements: Movement[];
  chartData: ChartDataPoint[];
}

export interface ChartDataPoint {
  date: string;
  entries: number;
  exits: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateItemDto {
  name: string;
  brand: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  minQuantity: number;
  location: string;
  categoryId: string;
}

export interface CreateCategoryDto {
  name: string;
}

export interface CreateMovementDto {
  type: MovementType;
  quantity: number;
  itemId: string;
  note?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
