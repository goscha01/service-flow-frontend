import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../utils/roleUtils';

const RoleProtectedRoute = ({ children, path }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Check if user can access this route
  if (!canAccessRoute(user, path || window.location.pathname)) {
    // Redirect workers to dashboard, others to settings
    const redirectPath = user?.role === 'worker' ? '/dashboard' : '/settings';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default RoleProtectedRoute;

