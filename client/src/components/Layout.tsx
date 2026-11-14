import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { hasRole, useAuth } from '../authContext';
import { ROLE_LABELS, type Summary } from '../types';
import { useApi } from '../useApi';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  // US-04: refresh the alert count whenever the user moves between pages.
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

  const alerts = summary.data ? summary.data.counts.expired + summary.data.counts.expiring : 0;

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          FreshTrack
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Dashboard
            {alerts > 0 && (
              <span className="nav-count" aria-label={`${alerts} products need attention`}>
                {alerts}
              </span>
            )}
          </NavLink>
          <NavLink to="/inventory">Inventory</NavLink>
          <NavLink to="/products/new">Add product</NavLink>
          {hasRole(user, 'manager', 'admin') && <NavLink to="/reports">Reports</NavLink>}
          {hasRole(user, 'admin') && <NavLink to="/users">Users</NavLink>}
        </nav>
        <div className="account">
          <span>
            {user?.username} <span className="muted">({user && ROLE_LABELS[user.role]})</span>
          </span>
          <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
    </div>
  );
}
