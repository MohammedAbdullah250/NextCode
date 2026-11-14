import { describe, expect, it } from 'vitest';
import { validateProduct, validateQuantity } from '../validation';

const valid = { name: 'Milk', category: '', quantity: '5', unit: 'L', expiryDate: '2026-12-01' };

describe('product form validation (US-01, US-03, US-06)', () => {
  it('accepts a complete product', () => {
    expect(validateProduct(valid)).toEqual({});
  });

  it('reports every missing required field', () => {
    expect(validateProduct({ ...valid, name: ' ', quantity: '', expiryDate: '' })).toEqual({
      name: 'Product name is required.',
      quantity: 'Quantity is required.',
      expiryDate: 'Expiry date is required.',
    });
  });

  it('rejects negative quantities', () => {
    expect(validateQuantity('-2')).toBe('Quantity cannot be negative.');
    expect(validateQuantity('0')).toBeUndefined();
    expect(validateQuantity('1.5')).toBeUndefined();
  });
});
