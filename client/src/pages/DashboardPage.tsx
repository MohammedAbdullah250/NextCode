import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { ConfirmButton } from '../components/ConfirmButton';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { ExpiryLane } from '../components/ExpiryLane';
import { ExpiryStrip } from '../components/ExpiryStrip';
import { Loading } from '../components/Loading';
import { TodayHeadline } from '../components/TodayHeadline';
import { formatDateCode, formatLongDate, formatQuantity } from '../format';
import { useShell } from '../shell';
import type { Product } from '../types';

export function DashboardPage() {
  const { summary, summaryError, refreshSummary } = useShell();
  const [error, setError] = useState<string | null>(null);

  if (summaryError && !summary) return <ErrorBanner message={summaryError} onRetry={refreshSummary} />;
  if (!summary) return <Loading />;

  const { counts, attention, warningDays, today, upcoming } = summary;
  const expired = attention.filter((product) => product.status === 'expired');
  const expiring = attention.filter((product) => product.status === 'expiring');

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

  function renderDiscard(product: Product) {
    if (product.quantity === 0) return null;
    const confirm = `Discard ${formatQuantity(product.quantity, product.unit)}?`;
    return <ConfirmButton label="Discard" confirm={confirm} onConfirm={() => discard(product)} />;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{formatLongDate(today)}</p>
          <h1 className="today-headline">
            <TodayHeadline expired={counts.expired} expiring={counts.expiring} total={counts.total} warningDays={warningDays} />
          </h1>
        </div>
      </header>

      <ErrorBanner message={error} />

      {counts.total === 0 && (
        <section className="panel">
          <EmptyState title="Your inventory is empty.">
            <Link to="/products/new">Add your first product</Link> and FreshTrack will start watching its expiry date.
          </EmptyState>
        </section>
      )}

      {counts.total > 0 && (
        <>
          <section className="panel" aria-labelledby="strip-title">
            <div className="panel-head">
              <h2 id="strip-title">Expiry calendar</h2>
              <p>
                Next {upcoming.length} days · <span className="mono">{formatDateCode(today)}</span>
              </p>
            </div>
            <ExpiryStrip summary={summary} />
          </section>

          <div className="two-col">
            <ExpiryLane
              title="Take off the shelf"
              description="Past the use-by date"
              products={expired}
              emptyMessage="Nothing has expired."
              renderAction={renderDiscard}
            />
            <ExpiryLane
              title="Sell or use first"
              description={`Expires within ${warningDays} days`}
              products={expiring}
              emptyMessage={`Nothing expires in the next ${warningDays} days.`}
            />
          </div>
        </>
      )}
    </>
  );
}
