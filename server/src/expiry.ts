import { addDays, daysBetween } from './dates.js';

export type ExpiryStatus = 'expired' | 'expiring' | 'fresh';

/**
 * Expiry rules shared by the inventory, alerts and reports.
 * - US-05: expired when the expiry date is earlier than today.
 * - US-04: approaching expiry when it expires today or within `warningDays` days.
 */
export function expiryStatus(expiryDate: string, today: string, warningDays: number): ExpiryStatus {
  const daysLeft = daysBetween(today, expiryDate);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= warningDays) return 'expiring';
  return 'fresh';
}

/** Last expiry date that still counts as "approaching expiry". */
export function warningCutoff(today: string, warningDays: number): string {
  return addDays(today, warningDays);
}
