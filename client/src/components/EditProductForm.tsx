import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { CATEGORY_MAX_LENGTH, PRODUCT_NAME_MAX_LENGTH } from '../limits';
import { UNITS, type Product } from '../types';
import { hasErrors, validateProduct, type Errors } from '../validation';
import { ErrorBanner } from './ErrorBanner';
import { Field } from './Field';

interface EditProductFormProps {
  product: Product;
  onCancel: () => void;
  onSaved: (product: Product) => void;
}

export function EditProductForm({ product, onCancel, onSaved }: EditProductFormProps) {
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

  function bindField(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value }),
    };
  }

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    const found = validateProduct(form, { requireQuantity: false });
    setErrors(found);
    setMessage(null);
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      const body = { name: form.name.trim(), category: form.category.trim() || null, unit: form.unit, expiryDate: form.expiryDate };
      const { product: saved } = await api<{ product: Product }>(`/products/${product.id}`, { method: 'PATCH', body });
      onSaved(saved);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setErrors(err.fields);
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={saveDetails} noValidate>
      <ErrorBanner message={message} />
      <Field label="Product name" error={errors.name}>
        <input {...bindField('name')} maxLength={PRODUCT_NAME_MAX_LENGTH} />
      </Field>
      <Field label="Category" optional error={errors.category}>
        <input {...bindField('category')} maxLength={CATEGORY_MAX_LENGTH} />
      </Field>
      <div className="field-row">
        <Field label="Use-by date" error={errors.expiryDate}>
          <input type="date" {...bindField('expiryDate')} />
        </Field>
        <Field label="Unit">
          <select {...bindField('unit')}>
            {UNITS.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </Field>
      </div>
      <p className="muted small form-note">Quantity is changed under “Update quantity” so every change is recorded.</p>
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
