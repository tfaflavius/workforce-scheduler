import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowedDepartments?: string[]; // Daca e setat, userii non-ADMIN trebuie sa fie din aceste departamente
}

export const ProtectedRoute = ({ children, allowedRoles, allowedDepartments }: ProtectedRouteProps) => {
  const { token, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!token) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to dashboard if role not allowed
    return <Navigate to="/dashboard" replace />;
  }

  // Daca sunt specificate departamente permise, verifica doar pentru USER (ADMIN si MANAGER au acces)
  if (allowedDepartments && user && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    const userDepartment = user.department?.name || '';
    if (!allowedDepartments.includes(userDepartment)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
