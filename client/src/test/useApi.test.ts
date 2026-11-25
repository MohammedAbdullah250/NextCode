import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { useApi } from '../useApi';

vi.mock('../api', () => ({ api: vi.fn() }));

beforeEach(() => vi.mocked(api).mockReset());

describe('useApi resource changes', () => {
  it('hides the previous product while a different product is loading', async () => {
    vi.mocked(api).mockResolvedValueOnce({ id: 1 });
    const { result, rerender } = renderHook(({ path }) => useApi<{ id: number }>(path), {
      initialProps: { path: '/products/1' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ id: 1 }));

    let resolveNext!: (value: { id: number }) => void;
    vi.mocked(api).mockReturnValueOnce(new Promise((resolve) => { resolveNext = resolve; }));
    rerender({ path: '/products/2' });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await act(async () => { resolveNext({ id: 2 }); });
    expect(result.current.data).toEqual({ id: 2 });
  });

  it('hides the previous request error when the resource changes', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('Product not found.'));
    const { result, rerender } = renderHook(({ path }) => useApi(path), {
      initialProps: { path: '/products/999' },
    });
    await waitFor(() => expect(result.current.error).toBe('Product not found.'));
    vi.mocked(api).mockReturnValueOnce(new Promise(() => {}));
    rerender({ path: '/products/1' });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('keeps existing data visible when reloading the same resource', async () => {
    vi.mocked(api).mockResolvedValueOnce({ id: 1 });
    const { result } = renderHook(() => useApi('/products/1'));
    await waitFor(() => expect(result.current.data).toEqual({ id: 1 }));
    vi.mocked(api).mockReturnValueOnce(new Promise(() => {}));
    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual({ id: 1 });
  });
});
