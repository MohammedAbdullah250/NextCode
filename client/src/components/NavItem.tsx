import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface NavItemProps {
  to: string;
  icon: ReactNode;
  current: boolean;
  count?: number;
  tone?: 'expired' | 'expiring';
  children: ReactNode;
}

export function NavItem({ to, icon, current, count, tone, children }: NavItemProps) {
  const highlight = tone && count ? ` nav-count-${tone}` : '';
  return (
    <Link to={to} aria-current={current ? 'page' : undefined}>
      {icon}
      {children}
      {count !== undefined && <span className={`nav-count${highlight}`}>{count}</span>}
    </Link>
  );
}
