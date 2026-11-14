import { Link } from 'react-router';
import { describeDaysLeft, formatDate, formatQuantity } from '../format';
import type { Product } from '../types';
import { StatusBadge } from './StatusBadge';

export function ProductTable({ products, caption }: { products: Product[]; caption: string }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">{caption}</caption>
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
          {products.map((p) => (
            <tr key={p.id} className={`row-${p.status}`}>
              <td>
                <Link to={`/products/${p.id}`}>{p.name}</Link>
              </td>
              <td>{p.category ?? <span className="muted">—</span>}</td>
              <td className="num">{formatQuantity(p.quantity, p.unit)}</td>
              <td>
                {formatDate(p.expiryDate)}
                <span className="subtext">{describeDaysLeft(p.daysLeft)}</span>
              </td>
              <td>
                <StatusBadge status={p.status} daysLeft={p.daysLeft} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
