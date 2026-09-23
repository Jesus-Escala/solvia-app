import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

const CHANGE_PASSWORD = '/change-password';

export function RequireAuth() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  // Temporary password: nothing else is reachable until a new one is set.
  if (user?.mustChangePassword && location.pathname !== CHANGE_PASSWORD) {
    return <Navigate to={CHANGE_PASSWORD} replace />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
