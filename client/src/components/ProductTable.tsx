import { Link } from 'react-router';
import { formatQuantity } from '../format';
import type { Product } from '../types';
import { DateCode, DaysLeft } from './Expiry';

export function ProductTable({ products, caption }: { products: Product[]; caption: string }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col" className="num">
              In stock
            </th>
            <th scope="col" className="hide-sm">
              Use by
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={`row-${p.status}${p.quantity === 0 ? ' row-empty' : ''}`}>
              <td className="cell-name">
                <Link to={`/products/${p.id}`}>{p.name}</Link>
                {p.category && <span className="cell-sub">{p.category}</span>}
              </td>
              <td className="num">{p.quantity === 0 ? 'Out of stock' : formatQuantity(p.quantity, p.unit)}</td>
              <td className="hide-sm">
                <DateCode date={p.expiryDate} />
              </td>
              <td>
                <DaysLeft days={p.daysLeft} status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
