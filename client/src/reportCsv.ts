import type { Report } from './types';

export function downloadReportCsv(report: Report) {
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
