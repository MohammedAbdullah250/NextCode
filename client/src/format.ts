const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const ISO_DATE_LENGTH = 10;
const QUANTITY_DECIMALS = 2;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const LONG_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });

function toUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function formatDate(iso: string): string {
  return DATE_FORMAT.format(toUtcDate(iso));
}

export function formatLongDate(iso: string): string {
  return LONG_DATE_FORMAT.format(toUtcDate(iso));
}

export function formatWeekday(iso: string): string {
  return WEEKDAY_FORMAT.format(toUtcDate(iso));
}

export function formatDayOfMonth(iso: string): number {
  return toUtcDate(iso).getUTCDate();
}

export function formatTimestamp(sqlite: string): string {
  return TIMESTAMP_FORMAT.format(new Date(sqlite.replace(' ', 'T') + 'Z'));
}

export function formatQuantity(quantity: number, unit: string): string {
  return `${formatAmount(quantity)} ${unit}`;
}

export function formatDateCode(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function describeDaysLeft(days: number): string {
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days left`;
}

export function shortDaysLeft(days: number): string {
  if (days < 0) return `${-days}d ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days}d`;
}

export function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * MS_PER_MINUTE).toISOString().slice(0, ISO_DATE_LENGTH);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

export function addDays(iso: string, days: number): string {
  const date = toUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

export function formatTimestampDate(sqlite: string): string {
  return formatDate(sqlite.slice(0, ISO_DATE_LENGTH));
}

export function formatAmount(amount: number): string {
  return Number(amount.toFixed(QUANTITY_DECIMALS)).toLocaleString('en');
}
