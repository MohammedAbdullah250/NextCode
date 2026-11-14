import { describeDaysLeft } from '../format';
import type { ExpiryStatus } from '../types';

const LABELS: Record<ExpiryStatus, string> = { expired: 'Expired', expiring: 'Expiring soon', fresh: 'Fresh' };

export function StatusBadge({ status, daysLeft }: { status: ExpiryStatus; daysLeft?: number }) {
  return (
    <span className={`badge badge-${status}`} title={daysLeft === undefined ? undefined : describeDaysLeft(daysLeft)}>
      {LABELS[status]}
    </span>
  );
}
