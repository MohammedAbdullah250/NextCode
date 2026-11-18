import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, ApiError } from '../api';
import { DaysLeft } from '../components/DaysLeft';
import { ErrorBanner } from '../components/ErrorBanner';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { Stamp } from '../components/Stamp';
import { expiryStatus } from '../expiry';
import { addDays, daysBetween, formatQuantity, todayISO } from '../format';
import { CATEGORY_MAX_LENGTH, DEFAULT_WARNING_DAYS, PRODUCT_NAME_MAX_LENGTH } from '../limits';
import { useShell } from '../shell';
import { UNITS, type Product } from '../types';
import { ICON_SMALL } from '../ui';
import { hasErrors, validateProduct, type Errors, type ProductForm } from '../validation';

const EMPTY_FORM: ProductForm = { name: '', category: '', quantity: '', unit: 'items', expiryDate: '' };

const QUICK_DATES = [
  { label: 'Tomorrow', days: 1 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
  { label: '+2 weeks', days: 14 },
  { label: '+1 month', days: 30 },
];

export function AddProductPage() {
  const navigate = useNavigate();
  const { summary, refreshSummary } = useShell();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayISO();

  function updateField(key: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function bindField(key: keyof ProductForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => updateField(key, e.target.value),
    };
  }

  async function saveProduct(e: FormEvent, addAnother: boolean) {
    e.preventDefault();
    const found = validateProduct(form);
    setErrors(found);
    setMessage(null);
    setSaved(null);
    if (hasErrors(found)) {
      setMessage('The product was not saved. Fix the fields marked below.');
      return;
    }

    setBusy(true);
    try {
      const body = { ...form, name: form.name.trim(), category: form.category.trim() || null, quantity: Number(form.quantity) };
      const { product } = await api<{ product: Product }>('/products', { body });
      refreshSummary();
      if (!addAnother) {
        navigate(`/products/${product.id}`, { state: { created: true } });
        return;
      }
      setSaved(product);
      setForm({ ...EMPTY_FORM, unit: form.unit, category: form.category });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setErrors(err.fields);
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  const daysLeft = form.expiryDate ? daysBetween(today, form.expiryDate) : null;
  const warningDays = summary?.warningDays ?? DEFAULT_WARNING_DAYS;
  const status = daysLeft === null ? null : expiryStatus(daysLeft, warningDays);
  const previewQuantity = form.quantity && Number(form.quantity) >= 0 ? formatQuantity(Number(form.quantity), form.unit) : '—';

  return (
    <>
      <header className="page-header">
        <div>
          <Link to="/inventory" className="breadcrumb">
            <ArrowLeft size={ICON_SMALL} aria-hidden="true" /> Inventory
          </Link>
          <h1>Add product</h1>
        </div>
      </header>

      <div className="two-col">
        <section className="panel">
          <form className="panel-body" onSubmit={(e) => saveProduct(e, false)} noValidate>
            {saved && (
              <Notice tone="success">
                Saved <Link to={`/products/${saved.id}`}>{saved.name}</Link>. Enter the next product.
              </Notice>
            )}
            <ErrorBanner message={message} />

            <Field label="Product name" error={errors.name}>
              <input {...bindField('name')} maxLength={PRODUCT_NAME_MAX_LENGTH} placeholder="e.g. Whole milk 1L" autoFocus />
            </Field>
            <Field label="Category" optional error={errors.category}>
              <input {...bindField('category')} maxLength={CATEGORY_MAX_LENGTH} placeholder="e.g. Dairy" />
            </Field>
            <div className="field-row">
              <Field label="Quantity" error={errors.quantity}>
                <input type="number" inputMode="decimal" min={0} step="any" placeholder="0" {...bindField('quantity')} />
              </Field>
              <Field label="Unit">
                <select {...bindField('unit')}>
                  {UNITS.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Use-by date" error={errors.expiryDate} hint="Copy it from the packaging.">
              <input type="date" {...bindField('expiryDate')} />
            </Field>
            <div className="chips chips-under-field">
              {QUICK_DATES.map((quick) => (
                <button key={quick.days} type="button" className="chip" onClick={() => updateField('expiryDate', addDays(today, quick.days))}>
                  {quick.label}
                </button>
              ))}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save product'}
              </button>
              <button type="button" className="btn" disabled={busy} onClick={(e) => saveProduct(e, true)}>
                Save and add another
              </button>
            </div>
          </form>
        </section>

        <aside className="panel" aria-label="Preview">
          <div className="panel-body">
            <p className="eyebrow">Preview</p>
            <div className="label-preview">
              <span className="eyebrow">{form.category.trim() || 'No category'}</span>
              <p className="preview-name">{form.name.trim() || 'Product name'}</p>
              {status && <Stamp date={form.expiryDate} status={status} />}
              {!status && <p className="muted small">Pick a use-by date to see its status.</p>}
              <div className="preview-row preview-row-first">
                <span className="muted">In stock</span>
                <span className="mono">{previewQuantity}</span>
              </div>
              <div className="preview-row">
                <span className="muted">Status</span>
                {status && daysLeft !== null && <DaysLeft days={daysLeft} status={status} />}
                {!status && <span className="muted">—</span>}
              </div>
            </div>
            {status === 'expired' && (
              <div className="stack-top">
                <Notice tone="warning">This date has already passed, so the product will be listed as expired.</Notice>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
