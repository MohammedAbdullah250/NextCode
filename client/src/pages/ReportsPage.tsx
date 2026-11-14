import { useState } from 'react';
import { Link } from 'react-router';
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback';
import { StatusBadge } from '../components/StatusBadge';
import { describeDaysLeft, formatDate, formatQuantity } from '../format';
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
      <div className="page-header">
        <h1>Expiry report</h1>
        <div className="header-actions no-print">
          <button type="button" className="btn" disabled={!data?.items.length} onClick={() => data && downloadCsv(data)}>
            Download CSV
          </button>
          <button type="button" className="btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <form className="card filters no-print" onSubmit={(e) => e.preventDefault()} aria-label="Report criteria">
        <label>
          Show
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Expired and expiring</option>
            <option value="expired">Expired only</option>
            <option value="expiring">Expiring soon only</option>
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

      <ErrorBanner message={error} onRetry={reload} />
      {loading && !data && <Loading label="Generating report…" />}
      {data && (
        <>
          <p className="muted small">
            Generated {new Date(data.generatedAt).toLocaleString('en-GB')} · “Expiring soon” means within {data.criteria.warningDays}{' '}
            days of {formatDate(data.criteria.today)}.
          </p>
          <div className="stats">
            <div className="stat stat-expired">
              <span className="stat-value">{data.totals.expired}</span>
              <span className="stat-label">Expired products</span>
            </div>
            <div className="stat stat-expiring">
              <span className="stat-value">{data.totals.expiring}</span>
              <span className="stat-label">Expiring soon</span>
            </div>
            <div className="stat">
              <span className="stat-value">{data.discarded.length}</span>
              <span className="stat-label">Products discarded (last {data.criteria.days} days)</span>
            </div>
          </div>

          <section className="card card-flush">
            <h2 className="card-title">Products</h2>
            {data.items.length === 0 ? (
              <EmptyState title="No matching products were found.">
                <p>Try a different report type or category.</p>
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Category</th>
                      <th scope="col" className="num">
                        Quantity
                      </th>
                      <th scope="col">Expiry date</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((i) => (
                      <tr key={i.id} className={`row-${i.status}`}>
                        <td>
                          <Link to={`/products/${i.id}`}>{i.name}</Link>
                        </td>
                        <td>{i.category ?? '—'}</td>
                        <td className="num">{formatQuantity(i.quantity, i.unit)}</td>
                        <td>
                          {formatDate(i.expiryDate)}
                          <span className="subtext">{describeDaysLeft(i.daysLeft)}</span>
                        </td>
                        <td>
                          <StatusBadge status={i.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card card-flush">
            <h2 className="card-title">Discarded stock (last {data.criteria.days} days)</h2>
            {data.discarded.length === 0 ? (
              <EmptyState title="No stock was recorded as discarded in this period." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Category</th>
                      <th scope="col" className="num">
                        Quantity discarded
                      </th>
                      <th scope="col" className="num">
                        Times
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.discarded.map((d) => (
                      <tr key={d.id}>
                        <td>{d.name}</td>
                        <td>{d.category ?? '—'}</td>
                        <td className="num">{formatQuantity(d.quantity, d.unit)}</td>
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
    ['Product', 'Category', 'Quantity', 'Unit', 'Expiry date', 'Days left', 'Status'],
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
