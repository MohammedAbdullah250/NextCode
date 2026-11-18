import { formatAmount, formatQuantity, formatTimestamp } from '../format';
import type { Movement } from '../types';
import { EmptyState } from './EmptyState';

const REASON_LABELS: Record<string, string> = {
  initial: 'Added to stock',
  received: 'Received',
  sold: 'Sold',
  used: 'Used',
  discarded: 'Discarded',
  correction: 'Count correction',
};

interface StockHistoryProps {
  movements: Movement[];
  unit: string;
}

export function StockHistory({ movements, unit }: StockHistoryProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Stock history</h2>
        <span className="count">{movements.length}</span>
      </div>
      {movements.length === 0 && <EmptyState title="No history yet." />}
      {movements.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">What</th>
                <th scope="col" className="num">
                  Change
                </th>
                <th scope="col" className="num">
                  Balance
                </th>
                <th scope="col">By</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="mono small">{formatTimestamp(movement.createdAt)}</td>
                  <td>
                    {REASON_LABELS[movement.reason] ?? movement.reason}
                    {movement.note && <span className="cell-sub">{movement.note}</span>}
                  </td>
                  <td className={`num ${movement.change < 0 ? 'change-down' : 'change-up'}`}>
                    {movement.change > 0 ? '+' : '−'}
                    {formatAmount(Math.abs(movement.change))}
                  </td>
                  <td className="num">{formatQuantity(movement.quantityAfter, unit)}</td>
                  <td>{movement.username ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
