import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
const ROLE_HIERARCHY: Record<string, number> = {
  'USER': 0,
  'MANAGER': 1,
  'ADMIN': 2,
  'MASTER_ADMIN': 3,
};

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

  // Hierarchical role check: user passes if their role level >= any required role level
  if (allowedRoles && user) {
    const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
    const hasAccess = allowedRoles.some((role) => {
      const requiredLevel = ROLE_HIERARCHY[role] ?? -1;
      return userLevel >= requiredLevel;
    });
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Daca sunt specificate departamente permise, verifica doar pentru USER (ADMIN, MASTER_ADMIN si MANAGER au acces)
  if (allowedDepartments && user && user.role !== 'ADMIN' && user.role !== 'MASTER_ADMIN' && user.role !== 'MANAGER') {
    const userDepartment = user.department?.name || '';
    if (!allowedDepartments.includes(userDepartment)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
