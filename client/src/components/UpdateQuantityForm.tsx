import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { formatQuantity } from '../format';
import { NOTE_MAX_LENGTH } from '../limits';
import { MOVEMENT_REASONS, type Product, type ProductDetail } from '../types';
import { hasErrors, validateQuantityChange, type Errors } from '../validation';
import { ErrorBanner } from './ErrorBanner';
import { Field } from './Field';

interface UpdateQuantityFormProps {
  product: Product;
  onSaved: (detail: ProductDetail) => void;
}

function previewChange(value: string, current: number): number | null {
  if (value.trim() === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount - current;
}

export function UpdateQuantityForm({ product, onSaved }: UpdateQuantityFormProps) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const change = previewChange(quantity, product.quantity);
  const reasonLabel = MOVEMENT_REASONS.find((option) => option.value === reason)?.short ?? '';
  const showChange = change !== null && change !== 0 && !errors.quantity;

  async function saveQuantity(e: FormEvent) {
    e.preventDefault();
    const found = validateQuantityChange(quantity, product.quantity, reason, reasonLabel);
    setErrors(found);
    setMessage(null);
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      const detail = await api<ProductDetail>(`/products/${product.id}/quantity`, {
        body: { quantity: Number(quantity), reason, note: note.trim() || null },
      });
      setQuantity('');
      setReason('');
      setNote('');
      onSaved(detail);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setErrors(err.fields);
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel-body" onSubmit={saveQuantity} noValidate>
      <ErrorBanner message={message} />
      <div className="field">
        <span id="reason-label" className="field-label">
          What happened?
        </span>
        <div className="reasons" role="group" aria-labelledby="reason-label">
          {MOVEMENT_REASONS.map((option) => (
            <button key={option.value} type="button" aria-pressed={reason === option.value} onClick={() => setReason(option.value)}>
              {option.short}
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
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder={String(product.quantity)}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </Field>
      {showChange && (
        <p className={`change-preview ${change < 0 ? 'change-down' : 'change-up'}`}>
          {change > 0 ? '+' : '−'}
          {formatQuantity(Math.abs(change), product.unit)} from {formatQuantity(product.quantity, product.unit)}
        </p>
      )}
      <Field label="Note" optional error={errors.note}>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX_LENGTH} placeholder="e.g. Delivery from supplier" />
      </Field>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save quantity'}
      </button>
    </form>
  );
}
