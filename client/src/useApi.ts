import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

interface Result<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Loads `path` from the API and reloads whenever it changes. Pass null to skip.
 * While reloading, the previous data stays visible.
 */
export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const key = path === null ? null : `${version}:${path}`;
  const [result, setResult] = useState<Result<T>>({ key: null, data: null, error: null });

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => setResult({ key, data, error: null }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setResult({ key, data: null, error: err.message });
      });
    return () => controller.abort();
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((data: T) => setResult({ key, data, error: null }), [key]);
  return {
    data: result.data,
    error: result.error,
    loading: key !== null && result.key !== key,
    reload,
    setData,
  };
}
