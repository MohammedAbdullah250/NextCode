import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../api';
import { hasRole, useAuth } from '../authContext';
import { Field } from '../components/Field';
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback';
import { StatusBadge } from '../components/StatusBadge';
import { describeDaysLeft, formatDate, formatQuantity, formatTimestamp } from '../format';
import { MOVEMENT_REASONS, UNITS, type Movement, type Product } from '../types';
import { useApi } from '../useApi';
import { validateProduct, validateQuantity, type Errors } from '../validation';

interface Detail {
  product: Product;
  movements: Movement[];
}

const REASON_LABELS: Record<string, string> = {
  initial: 'Added',
  ...Object.fromEntries(MOVEMENT_REASONS.map((r) => [r.value, r.label.replace(/ \(.*\)/, '')])),
};

export function ProductPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const created = (useLocation().state as { created?: boolean } | null)?.created;
  const { data, error, loading, reload, setData } = useApi<Detail>(`/products/${id}`);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(created ? 'Product saved.' : null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error || !data) {
    return (
      <>
        <ErrorBanner message={error} onRetry={error === 'Product not found.' ? undefined : reload} />
        <Link to="/inventory">Back to inventory</Link>
      </>
    );
  }

  const { product, movements } = data;

  async function archive() {
    if (!window.confirm(`Remove "${product.name}" from the inventory? Its records are kept for reporting.`)) return;
    try {
      await api(`/products/${product.id}/archive`, { method: 'POST' });
      navigate('/inventory');
    } catch (err) {
      setNotice(null);
      setActionError((err as Error).message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/inventory">Inventory</Link> /
          </p>
          <h1>
            {product.name} <StatusBadge status={product.status} daysLeft={product.daysLeft} />
          </h1>
        </div>
        <div className="header-actions">
          {!editing && (
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              Edit details
            </button>
          )}
          {hasRole(user, 'manager', 'admin') && (
            <button type="button" className="btn btn-danger" onClick={archive}>
              Remove
            </button>
          )}
        </div>
      </div>

      <ErrorBanner message={actionError} />
      {notice && (
        <div className="banner banner-success" role="status">
          {notice}
        </div>
      )}

      <div className="detail-grid">
        <section className="card">
          {editing ? (
            <EditDetails
              product={product}
              onCancel={() => setEditing(false)}
              onSaved={(p) => {
                setData({ ...data, product: p });
                setEditing(false);
                setNotice('Details updated.');
              }}
            />
          ) : (
            <dl className="details">
              <div>
                <dt>Quantity</dt>
                <dd className="big">{formatQuantity(product.quantity, product.unit)}</dd>
              </div>
              <div>
                <dt>Expiry date</dt>
                <dd className="big">{formatDate(product.expiryDate)}</dd>
                <dd className={`subtext text-${product.status}`}>{describeDaysLeft(product.daysLeft)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{product.category ?? '—'}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatTimestamp(product.updatedAt)}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="card">
          <h2>Update quantity</h2>
          <UpdateQuantity
            product={product}
            onSaved={(detail) => {
              setData(detail);
              setNotice(`Quantity updated to ${formatQuantity(detail.product.quantity, detail.product.unit)}.`);
            }}
          />
        </section>
      </div>

      <section className="card card-flush">
        <h2 className="card-title">Stock history</h2>
        {movements.length === 0 ? (
          <EmptyState title="No history yet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Change</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                  <th scope="col" className="num">
                    New total
                  </th>
                  <th scope="col">By</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatTimestamp(m.createdAt)}</td>
                    <td>{REASON_LABELS[m.reason] ?? m.reason}</td>
                    <td className={`num ${m.change < 0 ? 'text-expired' : 'text-fresh'}`}>
                      {m.change > 0 ? '+' : ''}
                      {Number(m.change.toFixed(2))}
                    </td>
                    <td className="num">{formatQuantity(m.quantityAfter, product.unit)}</td>
                    <td>{m.username ?? '—'}</td>
                    <td>{m.note ?? ''}</td>
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found: Errors = {};
    const qError = validateQuantity(quantity);
    if (qError) found.quantity = qError;
    else if (Number(quantity) === product.quantity) found.quantity = 'Enter a quantity different from the current one.';
    if (!reason) found.reason = 'Choose a reason for the change.';
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
    <form onSubmit={handleSubmit} noValidate>
      <ErrorBanner message={message} />
      <Field label={`New quantity (${product.unit})`} error={errors.quantity} hint={`Currently ${formatQuantity(product.quantity, product.unit)}.`}>
        <input type="number" inputMode="decimal" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </Field>
      <Field label="Reason" error={errors.reason}>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Choose…</option>
          {MOVEMENT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note" error={errors.note} hint="Optional.">
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
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
      <h2>Edit details</h2>
      <ErrorBanner message={message} />
      <Field label="Product name *" error={errors.name}>
        <input value={form.name} onChange={update('name')} maxLength={100} />
      </Field>
      <Field label="Category" error={errors.category}>
        <input value={form.category} onChange={update('category')} maxLength={50} />
      </Field>
      <div className="field-row">
        <Field label="Unit">
          <select value={form.unit} onChange={update('unit')}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Expiry date *" error={errors.expiryDate}>
          <input type="date" value={form.expiryDate} onChange={update('expiryDate')} />
        </Field>
      </div>
      <p className="muted small">To change the quantity, use “Update quantity” so the change is recorded in the history.</p>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
