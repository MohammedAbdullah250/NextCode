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

export interface Summary {
  counts: { total: number; expired: number; expiring: number; fresh: number };
  attention: Product[];
  warningDays: number;
  today: string;
}

export const UNITS = ['items', 'kg', 'g', 'L', 'ml', 'packs', 'boxes'] as const;

export const MOVEMENT_REASONS = [
  { value: 'received', label: 'Received (new stock)' },
  { value: 'sold', label: 'Sold' },
  { value: 'used', label: 'Used' },
  { value: 'discarded', label: 'Discarded (waste)' },
  { value: 'correction', label: 'Stock count correction' },
] as const;

export const ROLE_LABELS: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Administrator',
};
