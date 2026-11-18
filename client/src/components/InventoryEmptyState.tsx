import { Link } from 'react-router';
import { EmptyState } from './EmptyState';

interface InventoryEmptyStateProps {
  status: string;
  search: string;
  warningDays: number;
}

export function InventoryEmptyState({ status, search, warningDays }: InventoryEmptyStateProps) {
  if (search) {
    return (
      <EmptyState title={`No products in this view match “${search}”.`}>
        Check the spelling, try a category name, or select All to search
        across all expiry statuses.
      </EmptyState>
    );
  }
  if (status === 'expired') return <EmptyState title="No expired products.">Nothing needs to come off the shelf.</EmptyState>;
  if (status === 'expiring') return <EmptyState title={`Nothing expires in the next ${warningDays} days.`} />;
  if (status === 'fresh') return <EmptyState title="No products are in date." />;
  return (
    <EmptyState title="No products are available.">
      <Link to="/products/new">Add a product</Link> to start your inventory.
    </EmptyState>
  );
}
