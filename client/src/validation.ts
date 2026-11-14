// Mirrors the server rules so users see problems before submitting.
// The server still validates everything (it is the source of truth).

export interface ProductForm {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expiryDate: string;
}

export type Errors = Partial<Record<string, string>>;

export function validateQuantity(value: string): string | undefined {
  if (value.trim() === '') return 'Quantity is required.';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Quantity must be a number.';
  if (n < 0) return 'Quantity cannot be negative.';
  if (n > 1_000_000) return 'Quantity must be at most 1,000,000.';
  return undefined;
}

export function validateProduct(form: ProductForm, { requireQuantity = true } = {}): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = 'Product name is required.';
  else if (form.name.trim().length > 100) errors.name = 'Product name must be at most 100 characters.';
  if (form.category.trim().length > 50) errors.category = 'Category must be at most 50 characters.';
  if (requireQuantity) {
    const q = validateQuantity(form.quantity);
    if (q) errors.quantity = q;
  }
  if (!form.expiryDate) errors.expiryDate = 'Expiry date is required.';
  return errors;
}
