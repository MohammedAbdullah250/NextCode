export type Role = 'employee' | 'manager' | 'admin';
export type ExpiryStatus = 'expired' | 'expiring' | 'fresh';

export interface User {
  id: number;
  username: string;
  role: Role;
}

export interface ManagedUser extends User {
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  expiryDate: string;
  daysLeft: number;
  status: ExpiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: number;
  change: number;
  quantityAfter: number;
  reason: string;
  note: string | null;
  createdAt: string;
  username: string | null;
}

export interface ProductDetail {
  product: Product;
  movements: Movement[];
}

export interface Summary {
  counts: { total: number; expired: number; expiring: number; fresh: number };
  attention: Product[];
  upcoming: { date: string; count: number }[];
  warningDays: number;
  today: string;
}

export interface ReportItem {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  expiryDate: string;
  daysLeft: number;
  status: ExpiryStatus;
}

export interface Report {
  generatedAt: string;
  criteria: { type: string; category: string | null; days: number; warningDays: number; today: string };
  totals: { expired: number; expiring: number };
  items: ReportItem[];
  discarded: { id: number; name: string; category: string | null; unit: string; quantity: number; entries: number }[];
}

export const UNITS = ['items', 'kg', 'g', 'L', 'ml', 'packs', 'boxes'] as const;

export const MOVEMENT_REASONS = [
  { value: 'received', short: 'Received', label: 'Received (new stock)' },
  { value: 'sold', short: 'Sold', label: 'Sold' },
  { value: 'used', short: 'Used', label: 'Used' },
  { value: 'discarded', short: 'Discarded', label: 'Discarded (waste)' },
  { value: 'correction', short: 'Recount', label: 'Stock count correction' },
] as const;

export const ROLE_LABELS: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Administrator',
};

export const STATUS_LABELS: Record<ExpiryStatus, string> = {
  expired: 'Expired',
  expiring: 'Expiring soon',
  fresh: 'In date',
};
