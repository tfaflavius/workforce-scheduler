import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import SchedulesPage from '../pages/schedules/SchedulesPage';
import CreateSchedulePage from '../pages/schedules/CreateSchedulePage';
import EditSchedulePage from '../pages/schedules/EditSchedulePage';
import PendingSchedulesPage from '../pages/schedules/PendingSchedulesPage';
import MySchedulePage from '../pages/schedules/MySchedulePage';
import UsersPage from '../pages/users/UsersPage';
import UserProfilePage from '../pages/users/UserProfilePage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../store/hooks';

export const AppRoutes = () => {
  const { token } = useAppSelector((state) => state.auth);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={token ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />

      {/* Protected routes with MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - accessible by all authenticated users */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* My Schedule - for employees */}
        <Route path="/my-schedule" element={<MySchedulePage />} />

        {/* Schedules */}
        <Route
          path="/schedules"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <SchedulesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/create"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <CreateSchedulePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/pending"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PendingSchedulesPage />
            </ProtectedRoute>
          }
        />

        <Route path="/schedules/:id" element={<EditSchedulePage />} />

        {/* Users */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route path="/profile" element={<UserProfilePage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />

      {/* 404 - redirect to dashboard if authenticated, otherwise to login */}
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default AppRoutes;
