import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { DateCode, DaysLeft } from '../components/Expiry';
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback';
import { formatDate, formatQuantity } from '../format';
import type { ExpiryStatus } from '../types';
import { useApi } from '../useApi';

interface ReportItem {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  expiryDate: string;
  daysLeft: number;
  status: ExpiryStatus;
}

interface Report {
  generatedAt: string;
  criteria: { type: string; category: string | null; days: number; warningDays: number; today: string };
  totals: { expired: number; expiring: number };
  items: ReportItem[];
  discarded: { id: number; name: string; category: string | null; unit: string; quantity: number; entries: number }[];
}

// US-07: report of expired and expiring products, to monitor food waste.
export function ReportsPage() {
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('');
  const [days, setDays] = useState('30');
  const categories = useApi<{ categories: string[] }>('/reports/categories');
  const query = new URLSearchParams({ type, days, ...(category ? { category } : {}) });
  const { data, error, loading, reload } = useApi<Report>(`/reports/expiry?${query}`);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Manage</p>
          <h1>Expiry and waste report</h1>
        </div>
        <div className="header-actions no-print">
          <button type="button" className="btn" disabled={!data?.items.length} onClick={() => data && downloadCsv(data)}>
            <Download size={15} aria-hidden="true" /> CSV
          </button>
          <button type="button" className="btn" onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" /> Print
          </button>
        </div>
      </header>

      {data && (
        <p className="report-meta">
          Generated {formatDate(data.criteria.today)} at{' '}
          {new Date(data.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · “Expiring” means within{' '}
          {data.criteria.warningDays} days
        </p>
      )}

      <section className="panel">
        <form className="filters no-print" onSubmit={(e) => e.preventDefault()} aria-label="Report criteria">
          <label>
            Products
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">Expired and expiring</option>
              <option value="expired">Expired only</option>
              <option value="expiring">Expiring only</option>
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.data?.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Waste period
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
        </form>
        {data && (
          <div className="figures">
            <div className="figure">
              <span className="figure-value text-expired">{data.totals.expired}</span>
              <span className="figure-label">expired products in stock</span>
            </div>
            <div className="figure">
              <span className="figure-value text-expiring">{data.totals.expiring}</span>
              <span className="figure-label">expiring within {data.criteria.warningDays} days</span>
            </div>
            <div className="figure">
              <span className="figure-value">{data.discarded.length}</span>
              <span className="figure-label">products discarded, last {data.criteria.days} days</span>
            </div>
          </div>
        )}
      </section>

      <ErrorBanner message={error} onRetry={reload} />
      {loading && !data && <Loading label="Building report…" />}
      {data && (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Products to act on</h2>
              <span className="count">{data.items.length}</span>
            </div>
            {data.items.length === 0 ? (
              <EmptyState title="No matching products were found.">Try a different product type or category.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col" className="num">
                        In stock
                      </th>
                      <th scope="col">Use by</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((i) => (
                      <tr key={i.id} className={`row-${i.status}`}>
                        <td className="cell-name">
                          <Link to={`/products/${i.id}`}>{i.name}</Link>
                          {i.category && <span className="cell-sub">{i.category}</span>}
                        </td>
                        <td className="num">{formatQuantity(i.quantity, i.unit)}</td>
                        <td>
                          <DateCode date={i.expiryDate} />
                        </td>
                        <td>
                          <DaysLeft days={i.daysLeft} status={i.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Discarded stock</h2>
              <p>Last {data.criteria.days} days</p>
            </div>
            {data.discarded.length === 0 ? (
              <EmptyState title="Nothing was discarded in this period." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col" className="num">
                        Discarded
                      </th>
                      <th scope="col" className="num">
                        Times
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.discarded.map((d) => (
                      <tr key={d.id}>
                        <td className="cell-name">
                          <Link to={`/products/${d.id}`}>{d.name}</Link>
                          {d.category && <span className="cell-sub">{d.category}</span>}
                        </td>
                        <td className="num change-down">{formatQuantity(d.quantity, d.unit)}</td>
                        <td className="num">{d.entries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function downloadCsv(report: Report) {
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Product', 'Category', 'Quantity', 'Unit', 'Use-by date', 'Days left', 'Status'],
    ...report.items.map((i) => [i.name, i.category, i.quantity, i.unit, i.expiryDate, i.daysLeft, i.status]),
  ];
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `freshtrack-expiry-report-${report.criteria.today}.csv`,
  });
  link.click();
  URL.revokeObjectURL(url);
}
