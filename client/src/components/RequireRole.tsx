import { Outlet } from 'react-router';
import { hasRole, useAuth } from '../authContext';
import type { Role } from '../types';
import { EmptyState } from './EmptyState';

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (hasRole(user, ...roles)) return <Outlet />;
  return (
    <section className="panel">
      <EmptyState title="You don’t have access to this page.">Ask your administrator if you need it.</EmptyState>
    </section>
  );
}
