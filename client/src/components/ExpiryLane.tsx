import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatQuantity } from '../format';
import type { Product } from '../types';
import { DateCode } from './DateCode';
import { DaysLeft } from './DaysLeft';
import { EmptyState } from './EmptyState';

interface ExpiryLaneProps {
  title: string;
  description: string;
  products: Product[];
  emptyMessage: string;
  renderAction?: (product: Product) => ReactNode;
}

export function ExpiryLane({ title, description, products, emptyMessage, renderAction }: ExpiryLaneProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="count">{products.length}</span>
      </div>
      {products.length === 0 && <EmptyState title={emptyMessage} />}
      {products.length > 0 && (
        <ul className="lane-list">
          {products.map((product) => (
            <li key={product.id} className="lane-row">
              <div className="cell-name">
                <Link to={`/products/${product.id}`}>{product.name}</Link>
                <span className="cell-sub">
                  {product.quantity === 0 ? 'Out of stock' : formatQuantity(product.quantity, product.unit)} ·{' '}
                  <DateCode date={product.expiryDate} />
                </span>
              </div>
              <DaysLeft days={product.daysLeft} status={product.status} />
              {renderAction && <div className="lane-actions">{renderAction(product)}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
