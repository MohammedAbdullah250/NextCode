import { describeDaysLeft, shortDaysLeft } from '../format';
import type { ExpiryStatus } from '../types';

interface DaysLeftProps {
  days: number;
  status: ExpiryStatus;
}

export function DaysLeft({ days, status }: DaysLeftProps) {
  const tone = status === 'expiring' && days === 0 ? 'today' : status;
  const label = status === 'expired' ? `exp ${shortDaysLeft(days)}` : shortDaysLeft(days);
  return (
    <span className={`days days-${tone}`} title={describeDaysLeft(days)}>
      {label}
    </span>
  );
}
