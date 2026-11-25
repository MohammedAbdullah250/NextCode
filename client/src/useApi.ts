import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

interface Result<T> {
  key: string | null;
  path: string | null;
  data: T | null;
  error: string | null;
}

export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const key = path === null ? null : `${version}:${path}`;
  const [result, setResult] = useState<Result<T>>({ key: null, path: null, data: null, error: null });

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, path, data, error: null });
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setResult({ key, path, data: null, error: err.message });
      });
    return () => controller.abort();
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((data: T) => setResult({ key, path, data, error: null }), [key, path]);
  return {
    data: path !== null && result.path === path ? result.data : null,
    error: path !== null && result.path === path ? result.error : null,
    loading: key !== null && result.key !== key,
    reload,
    setData,
  };
}
