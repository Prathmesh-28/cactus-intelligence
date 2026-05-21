import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F1]">
        <div className="text-sm text-[#4A5E52]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ redirect: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
}
