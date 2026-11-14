import { describeDaysLeft, formatDateCode, shortDaysLeft } from '../format';
import type { ExpiryStatus } from '../types';

/** Small chip showing how far away the expiry date is. */
export function DaysLeft({ days, status }: { days: number; status: ExpiryStatus }) {
  const tone = status === 'expiring' && days === 0 ? 'today' : status;
  return (
    <span className={`days days-${tone}`} title={describeDaysLeft(days)}>
      {status === 'expired' ? `exp ${shortDaysLeft(days)}` : shortDaysLeft(days)}
    </span>
  );
}

export function DateCode({ date }: { date: string }) {
  return (
    <time className="date-code" dateTime={date}>
      {formatDateCode(date)}
    </time>
  );
}

/** Large expiry stamp used on the product page. */
export function Stamp({ date, status, label = 'Use by' }: { date: string; status: ExpiryStatus; label?: string }) {
  return (
    <div className={`stamp stamp-${status}`}>
      <span className="stamp-label">{label}</span>
      <time className="stamp-date" dateTime={date}>
        {formatDateCode(date)}
      </time>
    </div>
  );
}
