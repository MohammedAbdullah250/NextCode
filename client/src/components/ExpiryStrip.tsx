import { Link } from 'react-router';
import type { Summary } from '../types';

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });

/** Bar per day for the next 14 days, plus a bar for products already expired. */
export function ExpiryStrip({ summary }: { summary: Summary }) {
  const { upcoming, counts, warningDays } = summary;
  const max = Math.max(1, counts.expired, ...upcoming.map((d) => d.count));
  const height = (n: number) => `${(n / max) * 100}%`;
  const described = upcoming
    .filter((d) => d.count > 0)
    .map((d) => `${d.count} on ${d.date}`)
    .join(', ');

  return (
    <>
      <div className="strip" role="img" aria-label={`${counts.expired} expired. Expiring in the next 14 days: ${described || 'none'}.`}>
        <Link to="/inventory?status=expired" className="strip-col strip-col-expired" aria-hidden="true" tabIndex={-1}>
          <span className="strip-count">{counts.expired || ''}</span>
          <span className="strip-bar-area">
            <span className="strip-bar" style={{ height: height(counts.expired) }} />
          </span>
          <span className="strip-label">
            <span className="strip-dow">Past</span>
            <b>EXP</b>
          </span>
        </Link>
        {upcoming.map((day, i) => {
          const date = new Date(`${day.date}T00:00:00Z`);
          const classes = ['strip-col', i <= warningDays && 'strip-col-warn', i === 0 && 'strip-col-today'].filter(Boolean).join(' ');
          return (
            <div key={day.date} className={classes} aria-hidden="true" title={`${day.count} product${day.count === 1 ? '' : 's'} expire on ${day.date}`}>
              <span className="strip-count">{day.count || ''}</span>
              <span className="strip-bar-area">
                <span className="strip-bar" style={{ height: day.count ? height(day.count) : undefined }} />
              </span>
              <span className="strip-label">
                <span className="strip-dow">{i === 0 ? 'Today' : weekday.format(date)}</span>
                <b>{date.getUTCDate()}</b>
              </span>
            </div>
          );
        })}
      </div>
      <div className="strip-legend" aria-hidden="true">
        <span>
          <i className="swatch" style={{ background: 'var(--tomato)' }} />
          Expired
        </span>
        <span>
          <i className="swatch" style={{ background: 'var(--mustard-fill)' }} />
          Alert window ({warningDays} days)
        </span>
        <span>
          <i className="swatch" style={{ background: 'var(--rule-strong)' }} />
          Later
        </span>
      </div>
    </>
  );
}
