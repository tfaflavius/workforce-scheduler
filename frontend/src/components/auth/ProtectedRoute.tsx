import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { ROLE_HIERARCHY } from '../../utils/roleHelpers';

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

  // Hierarchical role check: user passes if their role level >= any required role level.
  // RESURSE_UMANE is a lateral, read-only role outside the hierarchy: it only matches
  // routes that explicitly list it in allowedRoles.
  if (allowedRoles && user) {
    let hasAccess: boolean;
    if (user.role === 'RESURSE_UMANE') {
      hasAccess = allowedRoles.includes('RESURSE_UMANE');
    } else {
      const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
      hasAccess = allowedRoles.some((role) => {
        const requiredLevel = ROLE_HIERARCHY[role] ?? -1;
        return userLevel >= requiredLevel;
      });
    }
    if (!hasAccess) {
      // HR has access only to schedules — send them there instead of the dashboard.
      return <Navigate to={user.role === 'RESURSE_UMANE' ? '/schedules' : '/dashboard'} replace />;
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
