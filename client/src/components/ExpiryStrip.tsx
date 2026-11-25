import { Link } from 'react-router';
import { formatDayOfMonth, formatWeekday } from '../format';
import type { Summary } from '../types';

const FULL_HEIGHT_PERCENT = 100;

function describeCalendar(summary: Summary): string {
  const days = summary.upcoming
    .filter((day) => day.count > 0)
    .map((day) => `${day.count} on ${day.date}`)
    .join(', ');
  return `${summary.counts.expired} expired. Expiring in the next ${summary.upcoming.length} days: ${days || 'none'}.`;
}

function columnClass(offset: number, warningDays: number): string {
  const classes = ['strip-col'];
  if (offset <= warningDays) classes.push('strip-col-warn');
  if (offset === 0) classes.push('strip-col-today');
  return classes.join(' ');
}

export function ExpiryStrip({ summary }: { summary: Summary }) {
  const { upcoming, counts, warningDays } = summary;
  const tallest = Math.max(1, counts.expired, ...upcoming.map((day) => day.count));
  const toBarHeight = (count: number) => (count ? `${(count / tallest) * FULL_HEIGHT_PERCENT}%` : undefined);

  return (
    <>
      <div className="strip" role="img" aria-label={describeCalendar(summary)}>
        <Link to="/inventory?status=expired" className="strip-col strip-col-expired" aria-hidden="true" tabIndex={-1}>
          <span className="strip-count">{counts.expired || ''}</span>
          <span className="strip-bar-area">
            <span className="strip-bar" style={{ height: toBarHeight(counts.expired) }} />
          </span>
          <span className="strip-label">
            <span className="strip-dow">Past</span>
            <b>EXP</b>
          </span>
        </Link>
        {upcoming.map((day, offset) => (
          <div
            key={day.date}
            className={columnClass(offset, warningDays)}
            aria-hidden="true"
            title={`${day.count} product${day.count === 1 ? '' : 's'} expire on ${day.date}`}
          >
            <span className="strip-count">{day.count || ''}</span>
            <span className="strip-bar-area">
              <span className="strip-bar" style={{ height: toBarHeight(day.count) }} />
            </span>
            <span className="strip-label">
              <span className="strip-dow">{offset === 0 ? 'Today' : formatWeekday(day.date)}</span>
              <b>{formatDayOfMonth(day.date)}</b>
            </span>
          </div>
        ))}
      </div>
      <div className="strip-legend" aria-hidden="true">
        <span>
          <i className="swatch swatch-expired" />
          Expired
        </span>
        <span>
          <i className="swatch swatch-expiring" />
          Alert window ({warningDays} days)
        </span>
        <span>
          <i className="swatch swatch-later" />
          Later
        </span>
      </div>
    </>
  );
}
