import { useAppSelector } from '../../store/hooks';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import EmployeeDashboard from './EmployeeDashboard';

export const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth);

  // Render dashboard based on user role
  switch (user?.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'MANAGER':
      return <ManagerDashboard />;
    case 'USER':
      return <EmployeeDashboard />;
    default:
      return <EmployeeDashboard />;
  }
};

export default DashboardPage;
