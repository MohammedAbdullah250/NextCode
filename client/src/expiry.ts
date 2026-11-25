import type { ExpiryStatus } from './types';

export function expiryStatus(daysLeft: number, warningDays: number): ExpiryStatus {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= warningDays) return 'expiring';
  return 'fresh';
}
