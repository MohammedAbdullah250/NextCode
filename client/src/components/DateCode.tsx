import { formatDateCode } from '../format';

export function DateCode({ date }: { date: string }) {
  return (
    <time className="date-code" dateTime={date}>
      {formatDateCode(date)}
    </time>
  );
}
