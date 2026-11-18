import { formatDateCode } from '../format';
import type { ExpiryStatus } from '../types';

interface StampProps {
  date: string;
  status: ExpiryStatus;
  label?: string;
}

export function Stamp({ date, status, label = 'Use by' }: StampProps) {
  return (
    <div className={`stamp stamp-${status}`}>
      <span className="stamp-label">{label}</span>
      <time className="stamp-date" dateTime={date}>
        {formatDateCode(date)}
      </time>
    </div>
  );
}
