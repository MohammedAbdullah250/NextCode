import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, onUnauthorized } from '../api';
import { AuthContext } from '../authContext';
import type { User } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const status = await api<{ needsSetup: boolean }>('/auth/setup-status');
        setNeedsSetup(status.needsSetup);
        if (!status.needsSetup) setUser((await api<{ user: User }>('/auth/me')).user);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) console.error(err);
      } finally {
        setChecking(false);
      }
    }
    loadSession();
    return onUnauthorized(() => setUser(null));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setUser((await api<{ user: User }>('/auth/login', { body: { username, password } })).user);
  }, []);

  const setup = useCallback(async (username: string, password: string) => {
    setUser((await api<{ user: User }>('/auth/setup', { body: { username, password } })).user);
    setNeedsSetup(false);
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, needsSetup, checking, login, setup, logout }),
    [user, needsSetup, checking, login, setup, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
