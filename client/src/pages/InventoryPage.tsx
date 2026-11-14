import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback';
import { ProductTable } from '../components/ProductTable';
import type { Product } from '../types';
import { useApi } from '../useApi';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'expiring', label: 'Expiring soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'fresh', label: 'Fresh' },
] as const;

export function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);

  // Wait until the user stops typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() === q) return;
      setParams((p) => {
        if (search.trim()) p.set('q', search.trim());
        else p.delete('q');
        return p;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, q, setParams]);

  const query = new URLSearchParams({ status, ...(q ? { q } : {}) });
  const { data, error, loading, reload } = useApi<{ products: Product[]; warningDays: number }>(`/products?${query}`);

  const setStatus = (value: string) =>
    setParams((p) => {
      if (value === 'all') p.delete('status');
      else p.set('status', value);
      return p;
    });

  return (
    <>
      <div className="page-header">
        <h1>{status === 'expired' ? 'Expired products' : 'Inventory'}</h1>
        <Link to="/products/new" className="btn btn-primary">
          Add product
        </Link>
      </div>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter by expiry status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              className={status === f.value ? 'active' : undefined}
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="search"
          placeholder="Search name or category"
          aria-label="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ErrorBanner message={error} onRetry={reload} />
      {loading && !data ? (
        <Loading label="Loading inventory…" />
      ) : (
        data && (
          <section className="card card-flush">
            {data.products.length === 0 ? (
              <EmptyMessage status={status} searching={q !== ''} warningDays={data.warningDays} />
            ) : (
              <>
                <ProductTable products={data.products} caption="Inventory" />
                <p className="table-footer muted">
                  {data.products.length} {data.products.length === 1 ? 'product' : 'products'}, sorted by expiry date
                </p>
              </>
            )}
          </section>
        )
      )}
    </>
  );
}

function EmptyMessage({ status, searching, warningDays }: { status: string; searching: boolean; warningDays: number }) {
  if (searching) return <EmptyState title="No products match your search." />;
  if (status === 'expired') return <EmptyState title="No expired products." />;
  if (status === 'expiring') return <EmptyState title={`No products expire within ${warningDays} days.`} />;
  if (status === 'fresh') return <EmptyState title="No fresh products." />;
  // US-02 AC2
  return (
    <EmptyState title="No products are available.">
      <p>
        <Link to="/products/new">Add a product</Link> to start building your inventory.
      </p>
    </EmptyState>
  );
}
