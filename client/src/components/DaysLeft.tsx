import { describeDaysLeft } from '../format';
import type { ExpiryStatus } from '../types';

interface DaysLeftProps {
  days: number;
  status: ExpiryStatus;
}

export function DaysLeft({ days, status }: DaysLeftProps) {
  const tone = status === 'expiring' && days === 0 ? 'today' : status;
  const label = describeDaysLeft(days);
  return (
    <span className={`days days-${tone}`} title={label}>
      {label}
    </span>
  );
}
