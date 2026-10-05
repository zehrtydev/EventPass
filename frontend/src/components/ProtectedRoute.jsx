import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage, LoadingSpinner } from './Feedback';

export default function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'checking') return <LoadingSpinner label="Validando tu sesión…" />;
  if (auth.status === 'error') return <div className="page narrow"><h1>No pudimos validar tu sesión</h1><ErrorMessage error={auth.error} onRetry={() => auth.validate()} /><button className="button secondary" onClick={auth.clear}>Volver a iniciar sesión</button></div>;
  if (!auth.authenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
