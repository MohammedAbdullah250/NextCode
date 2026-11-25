import { BarChart3, CalendarClock, CircleAlert, LogOut, Package, Plus, Sun, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { hasRole, useAuth } from '../authContext';
import type { ShellContext } from '../shell';
import { ROLE_LABELS, type Summary } from '../types';
import { ICON_MEDIUM, ICON_NAV, LOGO_SIDEBAR } from '../ui';
import { useApi } from '../useApi';
import { Logo } from './Logo';
import { NavItem } from './NavItem';

function inventoryStatus(pathname: string, search: string): string | null {
  if (pathname !== '/inventory') return null;
  return new URLSearchParams(search).get('status') ?? 'all';
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
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
  const status = inventoryStatus(location.pathname, location.search);
  const context: ShellContext = { summary: summary.data, summaryError: summary.error, refreshSummary: reload };

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="wordmark">
          <Logo size={LOGO_SIDEBAR} />
          FreshTrack
        </Link>

        <Link to="/products/new" className="btn btn-primary btn-add">
          <Plus size={ICON_MEDIUM} aria-hidden="true" />
          Add product
        </Link>

        <nav className="nav" aria-label="Main">
          <NavItem to="/" icon={<Sun size={ICON_NAV} />} current={location.pathname === '/'}>
            Today
          </NavItem>
          <NavItem
            to="/inventory"
            icon={<Package size={ICON_NAV} />}
            current={status === 'all' || status === 'fresh'}
            count={counts?.total}
          >
            Inventory
          </NavItem>
          <NavItem
            to="/inventory?status=expiring"
            icon={<CalendarClock size={ICON_NAV} />}
            current={status === 'expiring'}
            count={counts?.expiring}
            tone="expiring"
          >
            Expiring soon
          </NavItem>
          <NavItem
            to="/inventory?status=expired"
            icon={<CircleAlert size={ICON_NAV} />}
            current={status === 'expired'}
            count={counts?.expired}
            tone="expired"
          >
            Expired
          </NavItem>

          {hasRole(user, 'manager', 'admin') && <span className="nav-label">Manage</span>}
          {hasRole(user, 'manager', 'admin') && (
            <NavItem to="/reports" icon={<BarChart3 size={ICON_NAV} />} current={location.pathname === '/reports'}>
              Reports
            </NavItem>
          )}
          {hasRole(user, 'admin') && (
            <NavItem to="/users" icon={<Users size={ICON_NAV} />} current={location.pathname === '/users'}>
              Users
            </NavItem>
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
              <LogOut size={ICON_NAV} />
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
