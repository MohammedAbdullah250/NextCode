import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, ApiError } from '../api';
import { Field } from '../components/Field';
import { ErrorBanner } from '../components/Feedback';
import { todayISO } from '../format';
import { UNITS, type Product } from '../types';
import { validateProduct, type Errors, type ProductForm } from '../validation';

const EMPTY: ProductForm = { name: '', category: '', quantity: '', unit: 'items', expiryDate: '' };

// US-01 / US-03: add a product with its quantity and expiry date.
export function AddProductPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  async function submit(e: FormEvent, addAnother: boolean) {
    e.preventDefault();
    const found = validateProduct(form);
    setErrors(found);
    setMessage(null);
    setSaved(null);
    if (Object.keys(found).length) {
      setMessage('The product was not saved. Please correct the highlighted fields.');
      return;
    }

    setBusy(true);
    try {
      const { product } = await api<{ product: Product }>('/products', {
        body: { ...form, name: form.name.trim(), category: form.category.trim() || null, quantity: Number(form.quantity) },
      });
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

  return (
    <>
      <div className="page-header">
        <h1>Add product</h1>
        <Link to="/inventory" className="btn btn-ghost">
          Back to inventory
        </Link>
      </div>
      <section className="card form-card">
        {saved && (
          <div className="banner banner-success" role="status">
            Saved <Link to={`/products/${saved.id}`}>{saved.name}</Link>. Add the next product below.
          </div>
        )}
        <ErrorBanner message={message} />
        <form onSubmit={(e) => submit(e, false)} noValidate>
          <Field label="Product name *" error={errors.name}>
            <input value={form.name} onChange={update('name')} maxLength={100} autoFocus />
          </Field>
          <Field label="Category" error={errors.category} hint="Optional, e.g. Dairy, Bakery, Fruit.">
            <input value={form.category} onChange={update('category')} maxLength={50} />
          </Field>
          <div className="field-row">
            <Field label="Quantity *" error={errors.quantity}>
              <input type="number" inputMode="decimal" min={0} step="any" value={form.quantity} onChange={update('quantity')} />
            </Field>
            <Field label="Unit">
              <select value={form.unit} onChange={update('unit')}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Expiry date *" error={errors.expiryDate}>
            <input type="date" value={form.expiryDate} onChange={update('expiryDate')} />
          </Field>
          {form.expiryDate && form.expiryDate < todayISO() && (
            <p className="banner banner-warning">This date is in the past, so the product will be listed as expired.</p>
          )}
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
    </>
  );
}

