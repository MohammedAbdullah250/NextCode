import { createContext, useContext } from 'react';
import type { Role, User } from './types';

export interface AuthState {
  user: User | null;
  needsSetup: boolean;
  checking: boolean;
  login: (username: string, password: string) => Promise<void>;
  setup: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function hasRole(user: User | null, ...roles: Role[]): boolean {
  return user !== null && roles.includes(user.role);
}

