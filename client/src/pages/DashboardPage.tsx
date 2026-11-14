import { Link } from 'react-router';
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback';
import { ProductTable } from '../components/ProductTable';
import type { Summary } from '../types';
import { useApi } from '../useApi';

export function DashboardPage() {
  const { data, error, loading, reload } = useApi<Summary>('/products/summary');

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBanner message={error} onRetry={reload} />;

  const { counts, attention, warningDays } = data;
  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/products/new" className="btn btn-primary">
          Add product
        </Link>
      </div>

      {/* US-04: expiry notifications */}
      {counts.expired > 0 && (
        <div className="banner banner-error" role="alert">
          <strong>{counts.expired === 1 ? '1 product has' : `${counts.expired} products have`} expired.</strong>{' '}
          Remove {counts.expired === 1 ? 'it' : 'them'} from sale. <Link to="/inventory?status=expired">View expired products</Link>
        </div>
      )}
      {counts.expiring > 0 && (
        <div className="banner banner-warning" role="status">
          <strong>
            {counts.expiring === 1 ? '1 product expires' : `${counts.expiring} products expire`} within {warningDays} days.
          </strong>{' '}
          <Link to="/inventory?status=expiring">View expiring products</Link>
        </div>
      )}

      <div className="stats">
        <StatCard label="Products in stock" value={counts.total} to="/inventory" />
        <StatCard label={`Expiring within ${warningDays} days`} value={counts.expiring} to="/inventory?status=expiring" tone="expiring" />
        <StatCard label="Expired" value={counts.expired} to="/inventory?status=expired" tone="expired" />
        <StatCard label="Fresh" value={counts.fresh} to="/inventory?status=fresh" tone="fresh" />
      </div>

      <section className="card">
        <h2>Needs attention</h2>
        {counts.total === 0 ? (
          <EmptyState title="No products yet.">
            <p>
              <Link to="/products/new">Add your first product</Link> to start tracking expiry dates.
            </p>
          </EmptyState>
        ) : attention.length === 0 ? (
          <EmptyState title="Nothing needs attention.">
            <p>No products are expired or expiring within {warningDays} days.</p>
          </EmptyState>
        ) : (
          <ProductTable products={attention} caption="Products that are expired or expiring soon" />
        )}
      </section>
    </>
  );
}

function StatCard({ label, value, to, tone }: { label: string; value: number; to: string; tone?: string }) {
  return (
    <Link to={to} className={`stat${tone ? ` stat-${tone}` : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </Link>
  );
}
