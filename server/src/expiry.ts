import { addDays, daysBetween } from './dates.js';

export type ExpiryStatus = 'expired' | 'expiring' | 'fresh';

export const STATUS_SQL = `
  CASE WHEN expiry_date < @today THEN 'expired'
       WHEN expiry_date <= @cutoff THEN 'expiring'
       ELSE 'fresh' END`;

export const STATUS_FILTER: Record<ExpiryStatus, string> = {
  expired: 'expiry_date < @today',
  expiring: 'expiry_date >= @today AND expiry_date <= @cutoff',
  fresh: 'expiry_date > @cutoff',
};

export function expiryStatus(expiryDate: string, today: string, warningDays: number): ExpiryStatus {
  const daysLeft = daysBetween(today, expiryDate);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= warningDays) return 'expiring';
  return 'fresh';
}

export function warningCutoff(today: string, warningDays: number): string {
  return addDays(today, warningDays);
}
