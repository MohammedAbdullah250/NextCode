import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorBanner } from '../components/ErrorBanner';
import { InventoryEmptyState } from '../components/InventoryEmptyState';
import { Loading } from '../components/Loading';
import { ProductTable } from '../components/ProductTable';
import { SEARCH_DELAY_MS } from '../limits';
import { useShell } from '../shell';
import type { Product } from '../types';
import { ICON_SMALL } from '../ui';
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

interface InventoryResponse {
  products: Product[];
  warningDays: number;
}

export function InventoryPage() {
  const { summary } = useShell();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const query = params.get('q') ?? '';
  const [search, setSearch] = useState(query);
  const title = TITLES[status] ?? TITLES.all;

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed === query) return;
      setParams(
        (next) => {
          if (trimmed) next.set('q', trimmed);
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, query, setParams]);

  const apiQuery = new URLSearchParams({ status, ...(query ? { q: query } : {}) });
  const { data, error, loading, reload } = useApi<InventoryResponse>(`/products?${apiQuery}`);

  function changeStatus(value: string) {
    setParams((next) => {
      if (value === 'all') next.delete('status');
      else next.set('status', value);
      return next;
    });
  }

  function renderResults(result: InventoryResponse) {
    if (result.products.length === 0) {
      return <InventoryEmptyState status={status} search={query} warningDays={result.warningDays} />;
    }
    const count = result.products.length;
    return (
      <>
        <ProductTable products={result.products} caption={title} />
        <p className="table-foot">
          {count} {count === 1 ? 'product' : 'products'} · soonest expiry first
        </p>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Stock</p>
          <h1>{title}</h1>
        </div>
      </header>

      <section className="panel">
        <div className="toolbar">
          <div className="tabs" role="group" aria-label="Filter by expiry">
            {TABS.map((tab) => (
              <button key={tab.value} type="button" aria-pressed={status === tab.value} onClick={() => changeStatus(tab.value)}>
                {tab.label}
                {summary && <span className="tab-count">{summary.counts[tab.count]}</span>}
              </button>
            ))}
          </div>
          <div className="search-box">
            <Search size={ICON_SMALL} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search name or category"
              aria-label="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ErrorBanner message={error} onRetry={reload} />
        {loading && !data && <Loading label="Loading inventory…" />}
        {data && renderResults(data)}
      </section>
    </>
  );
}
