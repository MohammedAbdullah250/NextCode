import {
  CATEGORY_MAX_LENGTH,
  MAX_QUANTITY,
  PASSWORD_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from './limits';

export interface ProductForm {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expiryDate: string;
}

export type Errors = Partial<Record<string, string>>;

const INCREASING_REASONS = ['received'];
const DECREASING_REASONS = ['sold', 'used', 'discarded'];

export function validateQuantity(value: string): string | undefined {
  if (value.trim() === '') return 'Quantity is required.';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Quantity must be a number.';
  if (amount < 0) return 'Quantity cannot be negative.';
  if (amount > MAX_QUANTITY) return `Quantity must be at most ${MAX_QUANTITY.toLocaleString('en')}.`;
  return undefined;
}

export function validateProductName(name: string): string | undefined {
  if (!name.trim()) return 'Product name is required.';
  if (name.trim().length > PRODUCT_NAME_MAX_LENGTH) return `Product name must be at most ${PRODUCT_NAME_MAX_LENGTH} characters.`;
  return undefined;
}

export function validateProduct(form: ProductForm, { requireQuantity = true } = {}): Errors {
  const errors: Errors = {};
  errors.name = validateProductName(form.name);
  if (form.category.trim().length > CATEGORY_MAX_LENGTH) errors.category = `Category must be at most ${CATEGORY_MAX_LENGTH} characters.`;
  if (requireQuantity) errors.quantity = validateQuantity(form.quantity);
  if (!form.expiryDate) errors.expiryDate = 'Expiry date is required.';
  return removeEmpty(errors);
}

export function validateQuantityChange(value: string, current: number, reason: string, reasonLabel: string): Errors {
  const errors: Errors = { quantity: validateQuantity(value) };
  if (!reason) errors.reason = 'Choose why the quantity changed.';
  if (errors.quantity) return removeEmpty(errors);

  const change = Number(value) - current;
  if (change === 0) errors.quantity = 'That is the current quantity. Enter the new amount.';
  else if (INCREASING_REASONS.includes(reason) && change < 0) errors.quantity = `${reasonLabel} stock must increase the quantity.`;
  else if (DECREASING_REASONS.includes(reason) && change > 0) errors.quantity = `${reasonLabel} stock must lower the quantity.`;
  return removeEmpty(errors);
}

export function validateUsername(username: string): string | undefined {
  if (username.trim().length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  return undefined;
}

export function validateAccount(username: string, password: string): Errors {
  return removeEmpty({ username: validateUsername(username), password: validatePassword(password) });
}

export function hasErrors(errors: Errors): boolean {
  return Object.keys(errors).length > 0;
}

function removeEmpty(errors: Errors): Errors {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
