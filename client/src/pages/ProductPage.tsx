import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../api';
import { hasRole, useAuth } from '../authContext';
import { DaysLeft, Stamp } from '../components/Expiry';
import { Field } from '../components/Field';
import { EmptyState, ErrorBanner, Loading, Notice } from '../components/Feedback';
import { describeDaysLeft, formatQuantity, formatTimestamp } from '../format';
import { useShell } from '../shell';
import { MOVEMENT_REASONS, STATUS_LABELS, UNITS, type Movement, type Product } from '../types';
import { useApi } from '../useApi';
import { validateProduct, validateQuantity, type Errors } from '../validation';

interface Detail {
  product: Product;
  movements: Movement[];
}

const REASON_LABELS: Record<string, string> = {
  initial: 'Added to stock',
  received: 'Received',
  sold: 'Sold',
  used: 'Used',
  discarded: 'Discarded',
  correction: 'Count correction',
};

export function ProductPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { refreshSummary } = useShell();
  const navigate = useNavigate();
  const created = (useLocation().state as { created?: boolean } | null)?.created;
  const { data, error, loading, reload, setData } = useApi<Detail>(`/products/${id}`);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(created ? 'Product saved.' : null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) {
    return (
      <>
        <Link to="/inventory" className="breadcrumb">
          <ArrowLeft size={15} aria-hidden="true" /> Inventory
        </Link>
        <ErrorBanner message={error} onRetry={error === 'Product not found.' ? undefined : reload} />
      </>
    );
  }

  const { product, movements } = data;

  async function archive() {
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
            <ArrowLeft size={15} aria-hidden="true" /> Inventory
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
          {hasRole(user, 'manager', 'admin') &&
            (confirmRemove ? (
              <>
                <button type="button" className="btn btn-danger" onClick={archive} autoFocus>
                  Remove from inventory
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setConfirmRemove(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-quiet" onClick={() => setConfirmRemove(true)}>
                Remove…
              </button>
            ))}
        </div>
      </header>

      {confirmRemove && (
        <Notice tone="warning">Removing hides the product from stock lists. Its history is kept for reports.</Notice>
      )}
      <ErrorBanner message={actionError} />
      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="two-col">
        <section className="panel">
          <div className="panel-body">
            {editing ? (
              <EditDetails
                product={product}
                onCancel={() => setEditing(false)}
                onSaved={(p) => {
                  setData({ ...data, product: p });
                  setEditing(false);
                  setNotice('Details updated.');
                  refreshSummary();
                }}
              />
            ) : (
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
          <UpdateQuantity
            product={product}
            onSaved={(detail) => {
              setData(detail);
              setNotice(`Quantity is now ${formatQuantity(detail.product.quantity, detail.product.unit)}.`);
              refreshSummary();
            }}
          />
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Stock history</h2>
          <span className="count">{movements.length}</span>
        </div>
        {movements.length === 0 ? (
          <EmptyState title="No history yet." />
        ) : (
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
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="mono small">{formatTimestamp(m.createdAt)}</td>
                    <td>
                      {REASON_LABELS[m.reason] ?? m.reason}
                      {m.note && <span className="cell-sub">{m.note}</span>}
                    </td>
                    <td className={`num ${m.change < 0 ? 'change-down' : 'change-up'}`}>
                      {m.change > 0 ? '+' : '−'}
                      {Math.abs(Number(m.change.toFixed(2)))}
                    </td>
                    <td className="num">{formatQuantity(m.quantityAfter, product.unit)}</td>
                    <td>{m.username ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// US-06: set the new quantity, with a reason for the history.
function UpdateQuantity({ product, onSaved }: { product: Product; onSaved: (d: Detail) => void }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = quantity.trim() === '' ? null : Number(quantity);
  const change = parsed !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed - product.quantity : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found: Errors = {};
    const qError = validateQuantity(quantity);
    if (qError) found.quantity = qError;
    else if (change === 0) found.quantity = 'That is the current quantity. Enter the new amount.';
    else if (reason === 'received' && change !== null && change < 0) found.quantity = 'Received stock must increase the quantity.';
    else if (['sold', 'used', 'discarded'].includes(reason) && change !== null && change > 0)
      found.quantity = `${MOVEMENT_REASONS.find((r) => r.value === reason)!.short} stock must lower the quantity.`;
    if (!reason) found.reason = 'Choose why the quantity changed.';
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const detail = await api<Detail>(`/products/${product.id}/quantity`, {
        body: { quantity: Number(quantity), reason, note: note.trim() || null },
      });
      setQuantity('');
      setReason('');
      setNote('');
      onSaved(detail);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel-body" onSubmit={handleSubmit} noValidate>
      <ErrorBanner message={message} />
      <div className="field">
        <span id="reason-label" className="field-label">
          What happened?
        </span>
        <div className="reasons" role="group" aria-labelledby="reason-label">
          {MOVEMENT_REASONS.map((r) => (
            <button key={r.value} type="button" aria-pressed={reason === r.value} onClick={() => setReason(r.value)}>
              {r.short}
            </button>
          ))}
        </div>
        {errors.reason && (
          <p className="field-error" role="alert">
            {errors.reason}
          </p>
        )}
      </div>
      <Field label={`New total (${product.unit})`} error={errors.quantity}>
        <input type="number" inputMode="decimal" min={0} step="any" placeholder={String(product.quantity)} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </Field>
      {change !== null && change !== 0 && !errors.quantity && (
        <p className={`change-preview ${change < 0 ? 'change-down' : 'change-up'}`} style={{ marginTop: '-0.75rem', marginBottom: '1rem' }}>
          {change > 0 ? '+' : '−'}
          {formatQuantity(Math.abs(change), product.unit)} from {formatQuantity(product.quantity, product.unit)}
        </p>
      )}
      <Field label="Note" optional error={errors.note}>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Delivery from supplier" />
      </Field>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save quantity'}
      </button>
    </form>
  );
}

function EditDetails({ product, onCancel, onSaved }: { product: Product; onCancel: () => void; onSaved: (p: Product) => void }) {
  const [form, setForm] = useState({
    name: product.name,
    category: product.category ?? '',
    unit: product.unit,
    expiryDate: product.expiryDate,
    quantity: String(product.quantity),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateProduct(form, { requireQuantity: false });
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const { product: saved } = await api<{ product: Product }>(`/products/${product.id}`, {
        method: 'PATCH',
        body: { name: form.name.trim(), category: form.category.trim() || null, unit: form.unit, expiryDate: form.expiryDate },
      });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ErrorBanner message={message} />
      <Field label="Product name" error={errors.name}>
        <input value={form.name} onChange={update('name')} maxLength={100} />
      </Field>
      <Field label="Category" optional error={errors.category}>
        <input value={form.category} onChange={update('category')} maxLength={50} />
      </Field>
      <div className="field-row">
        <Field label="Use-by date" error={errors.expiryDate}>
          <input type="date" value={form.expiryDate} onChange={update('expiryDate')} />
        </Field>
        <Field label="Unit">
          <select value={form.unit} onChange={update('unit')}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
      </div>
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        Quantity is changed under “Update quantity” so every change is recorded.
      </p>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
