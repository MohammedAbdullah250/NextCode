import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, ApiError } from '../api';
import { DaysLeft, Stamp } from '../components/Expiry';
import { Field } from '../components/Field';
import { ErrorBanner, Notice } from '../components/Feedback';
import { addDays, daysBetween, formatQuantity, todayISO } from '../format';
import { useShell } from '../shell';
import { UNITS, type ExpiryStatus, type Product } from '../types';
import { validateProduct, type Errors, type ProductForm } from '../validation';

const EMPTY: ProductForm = { name: '', category: '', quantity: '', unit: 'items', expiryDate: '' };
const QUICK_DATES = [
  { label: 'Tomorrow', days: 1 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
  { label: '+2 weeks', days: 14 },
  { label: '+1 month', days: 30 },
];

// US-01 / US-03: add a product with its quantity and expiry date.
export function AddProductPage() {
  const navigate = useNavigate();
  const { summary, refreshSummary } = useShell();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayISO();

  const set = (key: keyof ProductForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key: keyof ProductForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set(key, e.target.value),
  });

  async function submit(e: FormEvent, addAnother: boolean) {
    e.preventDefault();
    const found = validateProduct(form);
    setErrors(found);
    setMessage(null);
    setSaved(null);
    if (Object.keys(found).length) {
      setMessage('The product was not saved. Fix the fields marked below.');
      return;
    }

    setBusy(true);
    try {
      const { product } = await api<{ product: Product }>('/products', {
        body: { ...form, name: form.name.trim(), category: form.category.trim() || null, quantity: Number(form.quantity) },
      });
      refreshSummary();
      if (addAnother) {
        setSaved(product);
        setForm({ ...EMPTY, unit: form.unit, category: form.category });
      } else {
        navigate(`/products/${product.id}`, { state: { created: true } });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const days = form.expiryDate ? daysBetween(today, form.expiryDate) : null;
  const warningDays = summary?.warningDays ?? 3;
  const status: ExpiryStatus | null = days === null ? null : days < 0 ? 'expired' : days <= warningDays ? 'expiring' : 'fresh';

  return (
    <>
      <header className="page-header">
        <div>
          <Link to="/inventory" className="breadcrumb">
            <ArrowLeft size={15} aria-hidden="true" /> Inventory
          </Link>
          <h1>Add product</h1>
        </div>
      </header>

      <div className="two-col">
        <section className="panel">
          <form className="panel-body" onSubmit={(e) => submit(e, false)} noValidate>
            {saved && (
              <Notice tone="success">
                Saved <Link to={`/products/${saved.id}`}>{saved.name}</Link>. Enter the next product.
              </Notice>
            )}
            <ErrorBanner message={message} />

            <Field label="Product name" error={errors.name}>
              <input {...bind('name')} maxLength={100} placeholder="e.g. Whole milk 1L" autoFocus />
            </Field>
            <Field label="Category" optional error={errors.category}>
              <input {...bind('category')} maxLength={50} placeholder="e.g. Dairy" />
            </Field>
            <div className="field-row">
              <Field label="Quantity" error={errors.quantity}>
                <input type="number" inputMode="decimal" min={0} step="any" placeholder="0" {...bind('quantity')} />
              </Field>
              <Field label="Unit">
                <select {...bind('unit')}>
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Use-by date" error={errors.expiryDate} hint="Copy it from the packaging.">
              <input type="date" {...bind('expiryDate')} />
            </Field>
            <div className="chips" style={{ marginTop: '-0.4rem', marginBottom: '1.25rem' }}>
              {QUICK_DATES.map((q) => (
                <button key={q.days} type="button" className="chip" onClick={() => set('expiryDate', addDays(today, q.days))}>
                  {q.label}
                </button>
              ))}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save product'}
              </button>
              <button type="button" className="btn" disabled={busy} onClick={(e) => submit(e, true)}>
                Save and add another
              </button>
            </div>
          </form>
        </section>

        <aside className="panel" aria-label="Preview">
          <div className="panel-body">
            <p className="eyebrow">Preview</p>
            <div className="label-preview" style={{ marginTop: '0.75rem' }}>
              <span className="eyebrow">{form.category.trim() || 'No category'}</span>
              <p className="preview-name">{form.name.trim() || 'Product name'}</p>
              {form.expiryDate && status ? <Stamp date={form.expiryDate} status={status} /> : <p className="muted small">Pick a use-by date to see its status.</p>}
              <div className="preview-row" style={{ marginTop: '1rem' }}>
                <span className="muted">In stock</span>
                <span className="mono">{form.quantity && Number(form.quantity) >= 0 ? formatQuantity(Number(form.quantity), form.unit) : '—'}</span>
              </div>
              <div className="preview-row">
                <span className="muted">Status</span>
                {days !== null && status ? <DaysLeft days={days} status={status} /> : <span className="muted">—</span>}
              </div>
            </div>
            {status === 'expired' && (
              <div style={{ marginTop: '1rem' }}>
                <Notice tone="warning">This date has already passed, so the product will be listed as expired.</Notice>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
