import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback';
import { ProductTable } from '../components/ProductTable';
import { useShell } from '../shell';
import type { Product } from '../types';
import { useApi } from '../useApi';

const TABS = [
  { value: 'all', label: 'All', count: 'total' },
  { value: 'expiring', label: 'Expiring soon', count: 'expiring' },
  { value: 'expired', label: 'Expired', count: 'expired' },
  { value: 'fresh', label: 'In date', count: 'fresh' },
] as const;

const TITLES: Record<string, string> = {
  all: 'Inventory',
  expiring: 'Expiring soon',
  expired: 'Expired',
  fresh: 'In date',
};

// US-02 inventory, US-04 expiring and US-05 expired lists share this page.
export function InventoryPage() {
  const { summary } = useShell();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);

  // Wait until the user stops typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() === q) return;
      setParams(
        (p) => {
          if (search.trim()) p.set('q', search.trim());
          else p.delete('q');
          return p;
        },
        { replace: true },
      );
    }, 250);
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
      <header className="page-header">
        <div>
          <p className="eyebrow">Stock</p>
          <h1>{TITLES[status] ?? 'Inventory'}</h1>
        </div>
      </header>

      <section className="panel">
        <div className="toolbar">
          <div className="tabs" role="group" aria-label="Filter by expiry">
            {TABS.map((t) => (
              <button key={t.value} type="button" aria-pressed={status === t.value} onClick={() => setStatus(t.value)}>
                {t.label}
                {summary && <span className="tab-count">{summary.counts[t.count]}</span>}
              </button>
            ))}
          </div>
          <div className="search-box">
            <Search size={15} aria-hidden="true" />
            <input type="search" placeholder="Search name or category" aria-label="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <ErrorBanner message={error} onRetry={reload} />
        {loading && !data ? (
          <Loading label="Loading inventory…" />
        ) : data && data.products.length === 0 ? (
          <EmptyMessage status={status} search={q} warningDays={data.warningDays} />
        ) : (
          data && (
            <>
              <ProductTable products={data.products} caption={TITLES[status] ?? 'Inventory'} />
              <p className="table-foot">
                {data.products.length} {data.products.length === 1 ? 'product' : 'products'} · soonest expiry first
              </p>
            </>
          )
        )}
      </section>
    </>
  );
}

function EmptyMessage({ status, search, warningDays }: { status: string; search: string; warningDays: number }) {
  if (search) return <EmptyState title={`No products match “${search}”.`}>Check the spelling or try the category name.</EmptyState>;
  if (status === 'expired') return <EmptyState title="No expired products.">Nothing needs to come off the shelf.</EmptyState>;
  if (status === 'expiring') return <EmptyState title={`Nothing expires in the next ${warningDays} days.`} />;
  if (status === 'fresh') return <EmptyState title="No products are in date." />;
  // US-02 AC2
  return (
    <EmptyState title="No products are available.">
      <Link to="/products/new">Add a product</Link> to start your inventory.
    </EmptyState>
  );
}
