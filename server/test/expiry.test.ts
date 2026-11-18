import { describe, expect, it } from 'vitest';
import { isValidISODate } from '../src/dates.js';
import { expiryStatus } from '../src/expiry.js';

describe('expiry rules', () => {
  const today = '2026-11-14';

  it.each([
    ['2026-11-13', 'expired'],
    ['2026-01-01', 'expired'],
    ['2026-11-14', 'expiring'],
    ['2026-11-17', 'expiring'],
    ['2026-11-18', 'fresh'],
  ] as const)('%s is %s', (date, status) => {
    expect(expiryStatus(date, today, 3)).toBe(status);
  });

  it('handles month and year boundaries', () => {
    expect(expiryStatus('2027-01-02', '2026-12-30', 3)).toBe('expiring');
    expect(expiryStatus('2026-12-31', '2027-01-01', 3)).toBe('expired');
  });

  it('rejects impossible dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('14/11/2026')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
  });
});
