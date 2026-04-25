// ============================================================================
// === IMPORTS ===
// ============================================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasRole } from '../../hooks/usePermission';
import LoadingSpinner from './LoadingSpinner';

// ============================================================================
// === MAIN COMPONENT: PROTECTED ROUTE ===
// ============================================================================
// allowedRoles: string[] — bu prop verilirse sadece o roller erişebilir
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Rol kısıtı varsa ve kullanıcının rolü bu listedeyse izin ver
  if (allowedRoles.length > 0 && !hasRole(user?.rolle, allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

