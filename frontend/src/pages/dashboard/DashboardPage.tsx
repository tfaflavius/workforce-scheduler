import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { useAppSelector } from '../../store/hooks';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const ManagerDashboard = lazy(() => import('./ManagerDashboard'));
const EmployeeDashboard = lazy(() => import('./EmployeeDashboard'));

const DashboardLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
    <CircularProgress />
  </Box>
);

export const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth);

  const getDashboard = () => {
    switch (user?.role) {
      case 'MASTER_ADMIN':
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

  return (
    <Suspense fallback={<DashboardLoader />}>
      {getDashboard()}
    </Suspense>
  );
};

export default DashboardPage;
