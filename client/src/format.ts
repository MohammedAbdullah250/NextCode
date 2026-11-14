const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** "2026-11-30" -> "30 Nov 2026" */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}

/** SQLite UTC timestamp ("2026-11-14 10:30:00") -> local date and time. */
export function formatTimestamp(sqlite: string): string {
  return dateTimeFormat.format(new Date(sqlite.replace(' ', 'T') + 'Z'));
}

export function formatQuantity(quantity: number, unit: string): string {
  return `${Number(quantity.toFixed(2)).toLocaleString('en')} ${unit}`;
}

export function describeDaysLeft(days: number): string {
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days left`;
}

/** Today's local date as YYYY-MM-DD, for date inputs. */
export function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2026-11-30" -> "30 NOV 2026", styled like a packaging date stamp. */
export function formatDateCode(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** Compact label for the day chip: "3d ago", "today", "tomorrow", "in 5d". */
export function shortDaysLeft(days: number): string {
  if (days < 0) return `${-days}d ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days}d`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
