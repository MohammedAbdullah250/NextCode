import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../authContext';
import { Loading } from './Loading';

export function RequireAuth() {
  const { user, needsSetup, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Loading label="Loading FreshTrack…" />;
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
