import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { api, ApiError, onUnauthorized } from './api';
import { AuthContext, hasRole, useAuth } from './authContext';
import type { Role, User } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { needsSetup } = await api<{ needsSetup: boolean }>('/auth/setup-status');
        setNeedsSetup(needsSetup);
        if (!needsSetup) setUser((await api<{ user: User }>('/auth/me')).user);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) console.error(err);
      } finally {
        setChecking(false);
      }
    })();
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

/** Route guard: sends logged-out visitors to the login page (or first-time setup). */
export function RequireAuth() {
  const { user, needsSetup, checking } = useAuth();
  const location = useLocation();
  if (checking) return <p className="loading">Loading FreshTrack…</p>;
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Route guard for pages limited to certain roles. The server enforces the same rule. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!hasRole(user, ...roles)) {
    return (
      <section className="panel">
        <div className="empty">
          <p className="empty-title">You don’t have access to this page.</p>
          <p>Ask your administrator if you need it.</p>
        </div>
      </section>
    );
  }
  return <Outlet />;
}
