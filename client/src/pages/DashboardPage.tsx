import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { DateCode, DaysLeft } from '../components/Expiry';
import { ExpiryStrip } from '../components/ExpiryStrip';
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback';
import { formatDateCode, formatQuantity } from '../format';
import { useShell } from '../shell';
import type { Product } from '../types';

const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// US-04: what needs doing today, most urgent first.
export function DashboardPage() {
  const { summary, refreshSummary } = useShell();
  const [error, setError] = useState<string | null>(null);

  if (!summary) return <Loading />;

  const { counts, attention, warningDays, today } = summary;
  const expired = attention.filter((p) => p.status === 'expired');
  const expiring = attention.filter((p) => p.status === 'expiring');

  async function discard(product: Product) {
    setError(null);
    try {
      await api(`/products/${product.id}/quantity`, {
        body: { quantity: 0, reason: 'discarded', note: 'Discarded from the Today page' },
      });
      refreshSummary();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{longDate.format(new Date(`${today}T00:00:00Z`))}</p>
          <h1 className="today-headline">
            <Headline expired={counts.expired} expiring={counts.expiring} total={counts.total} warningDays={warningDays} />
          </h1>
        </div>
      </header>

      <ErrorBanner message={error} />

      {counts.total === 0 ? (
        <section className="panel">
          <EmptyState title="Your inventory is empty.">
            <Link to="/products/new">Add your first product</Link> and FreshTrack will start watching its expiry date.
          </EmptyState>
        </section>
      ) : (
        <>
          <section className="panel" aria-labelledby="strip-title">
            <div className="panel-head">
              <h2 id="strip-title">Expiry calendar</h2>
              <p>
                Next 14 days · <span className="mono">{formatDateCode(today)}</span>
              </p>
            </div>
            <ExpiryStrip summary={summary} />
          </section>

          <div className="two-col">
            <Lane
              title="Take off the shelf"
              description="Past the use-by date"
              products={expired}
              empty="Nothing has expired."
              action={(p) =>
                p.quantity > 0 ? <ConfirmButton label="Discard" confirm={`Discard ${formatQuantity(p.quantity, p.unit)}?`} onConfirm={() => discard(p)} /> : null
              }
            />
            <Lane
              title="Sell or use first"
              description={`Expires within ${warningDays} days`}
              products={expiring}
              empty={`Nothing expires in the next ${warningDays} days.`}
            />
          </div>
        </>
      )}
    </>
  );
}

function Headline({ expired, expiring, total, warningDays }: { expired: number; expiring: number; total: number; warningDays: number }) {
  if (total === 0) return <>Let’s stock the shelves.</>;
  if (expired === 0 && expiring === 0) return <>Everything on the shelf is in date.</>;
  const parts: React.ReactNode[] = [];
  if (expired) parts.push(<em key="e">{expired} expired</em>);
  if (expiring) parts.push(<span key="s">{expiring} expiring within {warningDays} days</span>);
  return (
    <>
      {parts.length === 2 ? (
        <>
          {parts[0]} and {parts[1]}.
        </>
      ) : (
        <>{parts[0]}.</>
      )}
    </>
  );
}

interface LaneProps {
  title: string;
  description: string;
  products: Product[];
  empty: string;
  action?: (p: Product) => React.ReactNode;
}

function Lane({ title, description, products, empty, action }: LaneProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="count">{products.length}</span>
      </div>
      {products.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {products.map((p) => (
            <li key={p.id} className="lane-row">
              <div className="cell-name">
                <Link to={`/products/${p.id}`}>{p.name}</Link>
                <span className="cell-sub">
                  {p.quantity === 0 ? 'Out of stock' : formatQuantity(p.quantity, p.unit)} · <DateCode date={p.expiryDate} />
                </span>
              </div>
              <DaysLeft days={p.daysLeft} status={p.status} />
              {action && <div className="lane-actions">{action(p)}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Two-step button so a stock write-off can't happen with a stray click. */
function ConfirmButton({ label, confirm, onConfirm }: { label: string; confirm: string; onConfirm: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) {
    return (
      <button type="button" className="btn btn-small" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <>
      <button
        type="button"
        className="btn btn-small btn-danger"
        disabled={busy}
        autoFocus
        onClick={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
          setAsking(false);
        }}
      >
        {confirm}
      </button>
      <button type="button" className="btn btn-small btn-quiet" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </>
  );
}
