// ============================================================================
// === IMPORTS ===
// ============================================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

// ============================================================================
// === MAIN COMPONENT: PROTECTED ROUTE ===
// ============================================================================
export default function ProtectedRoute({ children }) {
  // ---------- STATE & LOGIC ----------
  const { isAuthenticated, isLoading } = useAuth();

  // Loading state: Show spinner
  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <LoadingSpinner />
      </div>
    );
  }

  // Not authenticated: Redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated: Render children
  return children;
}
