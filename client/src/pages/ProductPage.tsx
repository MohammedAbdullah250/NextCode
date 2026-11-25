import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api } from '../api';
import { hasRole, useAuth } from '../authContext';
import { DaysLeft } from '../components/DaysLeft';
import { EditProductForm } from '../components/EditProductForm';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { Notice } from '../components/Notice';
import { Stamp } from '../components/Stamp';
import { StockHistory } from '../components/StockHistory';
import { UpdateQuantityForm } from '../components/UpdateQuantityForm';
import { describeDaysLeft, formatQuantity, formatTimestamp } from '../format';
import { useShell } from '../shell';
import { STATUS_LABELS, type ProductDetail } from '../types';
import { ICON_SMALL } from '../ui';
import { useApi } from '../useApi';

export function ProductPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { refreshSummary } = useShell();
  const navigate = useNavigate();
  const created = (useLocation().state as { created?: boolean } | null)?.created;
  const { data, error, loading, reload, setData } = useApi<ProductDetail>(`/products/${id}`);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(created ? 'Product saved.' : null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) {
    return (
      <>
        <Link to="/inventory" className="breadcrumb">
          <ArrowLeft size={ICON_SMALL} aria-hidden="true" /> Inventory
        </Link>
        <ErrorBanner message={error} onRetry={error === 'Product not found.' ? undefined : reload} />
      </>
    );
  }

  const { product, movements } = data;
  const canRemove = hasRole(user, 'manager', 'admin');

  async function archiveProduct() {
    try {
      await api(`/products/${product.id}/archive`, { method: 'POST' });
      refreshSummary();
      navigate('/inventory');
    } catch (err) {
      setNotice(null);
      setActionError((err as Error).message);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <Link to="/inventory" className="breadcrumb">
            <ArrowLeft size={ICON_SMALL} aria-hidden="true" /> Inventory
          </Link>
          <p className="eyebrow">{product.category ?? 'No category'}</p>
          <div className="page-title-row">
            <h1>{product.name}</h1>
            <DaysLeft days={product.daysLeft} status={product.status} />
          </div>
        </div>
        <div className="header-actions">
          {!editing && (
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              Edit details
            </button>
          )}
          {canRemove && confirmRemove && (
            <>
              <button type="button" className="btn btn-danger" onClick={archiveProduct} autoFocus>
                Remove from inventory
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirmRemove(false)}>
                Cancel
              </button>
            </>
          )}
          {canRemove && !confirmRemove && (
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmRemove(true)}>
              Remove…
            </button>
          )}
        </div>
      </header>

      {confirmRemove && <Notice tone="warning">Removing hides the product from stock lists. Its history is kept for reports.</Notice>}
      <ErrorBanner message={actionError} />
      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="two-col">
        <section className="panel">
          <div className="panel-body">
            {editing && (
              <EditProductForm
                product={product}
                onCancel={() => setEditing(false)}
                onSaved={(saved) => {
                  setData({ ...data, product: saved });
                  setEditing(false);
                  setNotice('Details updated.');
                  refreshSummary();
                }}
              />
            )}
            {!editing && (
              <>
                <div className="facts">
                  <Stamp date={product.expiryDate} status={product.status} />
                  <div>
                    <p className="eyebrow">In stock</p>
                    <p className="fact-value">{product.quantity === 0 ? 'None' : formatQuantity(product.quantity, product.unit)}</p>
                  </div>
                </div>
                <dl className="fact-meta">
                  <dt>Status</dt>
                  <dd className={`text-${product.status}`}>
                    {STATUS_LABELS[product.status]} · {describeDaysLeft(product.daysLeft).toLowerCase()}
                  </dd>
                  <dt>Added</dt>
                  <dd>{formatTimestamp(product.createdAt)}</dd>
                  <dt>Last change</dt>
                  <dd>{formatTimestamp(product.updatedAt)}</dd>
                </dl>
              </>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Update quantity</h2>
          </div>
          <UpdateQuantityForm
            product={product}
            onSaved={(detail) => {
              setData(detail);
              setNotice(`Quantity is now ${formatQuantity(detail.product.quantity, detail.product.unit)}.`);
              refreshSummary();
            }}
          />
        </section>
      </div>

      <StockHistory movements={movements} unit={product.unit} />
    </>
  );
}
