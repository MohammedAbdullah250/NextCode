import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';

afterEach(() => vi.unstubAllGlobals());

describe('api()', () => {
  it('rejects instead of returning {} when the request is cancelled while reading the body', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const response = { ok: true, status: 200, json: () => Promise.reject(abort) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(api('/products/summary')).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('turns a server error into an ApiError with field messages', async () => {
    const body = { error: 'Please correct the highlighted fields.', fields: { quantity: 'Quantity cannot be negative.' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 400 })));
    await expect(api('/products/1/quantity', { body: {} })).rejects.toMatchObject({ status: 400, fields: body.fields });
  });
});
