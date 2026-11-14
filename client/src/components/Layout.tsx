import { BarChart3, CalendarClock, CircleAlert, LogOut, Package, Plus, Sun, Users } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { hasRole, useAuth } from '../authContext';
import type { ShellContext } from '../shell';
import { ROLE_LABELS, type Summary } from '../types';
import { useApi } from '../useApi';
import { Logo } from './Logo';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  // US-04: the sidebar counts act as a constant expiry alert, refreshed on every page change.
  const summary = useApi<Summary>('/products/summary');
  const { reload } = summary;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    reload();
  }, [location.pathname, reload]);

  const counts = summary.data?.counts;
  const status = location.pathname === '/inventory' ? (new URLSearchParams(location.search).get('status') ?? 'all') : null;
  const context: ShellContext = { summary: summary.data, refreshSummary: reload };

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="wordmark">
          <Logo size={26} />
          FreshTrack
        </Link>

        <Link to="/products/new" className="btn btn-primary btn-add">
          <Plus size={16} aria-hidden="true" />
          Add product
        </Link>

        <nav className="nav" aria-label="Main">
          <NavItem to="/" icon={<Sun size={17} />} current={location.pathname === '/'}>
            Today
          </NavItem>
          <NavItem to="/inventory" icon={<Package size={17} />} current={status === 'all' || status === 'fresh'} count={counts?.total}>
            Inventory
          </NavItem>
          <NavItem
            to="/inventory?status=expiring"
            icon={<CalendarClock size={17} />}
            current={status === 'expiring'}
            count={counts?.expiring}
            tone="expiring"
          >
            Expiring soon
          </NavItem>
          <NavItem
            to="/inventory?status=expired"
            icon={<CircleAlert size={17} />}
            current={status === 'expired'}
            count={counts?.expired}
            tone="expired"
          >
            Expired
          </NavItem>

          {hasRole(user, 'manager', 'admin') && (
            <>
              <span className="nav-label">Manage</span>
              <NavItem to="/reports" icon={<BarChart3 size={17} />} current={location.pathname === '/reports'}>
                Reports
              </NavItem>
              {hasRole(user, 'admin') && (
                <NavItem to="/users" icon={<Users size={17} />} current={location.pathname === '/users'}>
                  Users
                </NavItem>
              )}
            </>
          )}
        </nav>

        {user && (
          <div className="account">
            <span className="avatar" aria-hidden="true">
              {user.username[0]}
            </span>
            <div>
              <div className="account-name">{user.username}</div>
              <div className="account-role">{ROLE_LABELS[user.role]}</div>
            </div>
            <button type="button" className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
              <LogOut size={17} />
            </button>
          </div>
        )}
      </aside>

      <main id="main" className="content">
        <Outlet context={context} />
      </main>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: ReactNode;
  current: boolean;
  count?: number;
  tone?: 'expired' | 'expiring';
  children: ReactNode;
}

function NavItem({ to, icon, current, count, tone, children }: NavItemProps) {
  const highlight = tone && count ? ` nav-count-${tone}` : '';
  return (
    <Link to={to} aria-current={current ? 'page' : undefined}>
      {icon}
      {children}
      {count !== undefined && <span className={`nav-count${highlight}`}>{count}</span>}
    </Link>
  );
}
