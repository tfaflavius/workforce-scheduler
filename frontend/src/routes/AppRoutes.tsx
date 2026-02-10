import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import SchedulesPage from '../pages/schedules/SchedulesPage';
import CreateSchedulePage from '../pages/schedules/CreateSchedulePage';
import EditSchedulePage from '../pages/schedules/EditSchedulePage';
import PendingSchedulesPage from '../pages/schedules/PendingSchedulesPage';
import RejectedSchedulesPage from '../pages/schedules/RejectedSchedulesPage';
import MySchedulePage from '../pages/schedules/MySchedulePage';
import ShiftSwapsPage from '../pages/shift-swaps/ShiftSwapsPage';
import AdminShiftSwapsPage from '../pages/shift-swaps/AdminShiftSwapsPage';
import LeaveRequestsPage from '../pages/leave-requests/LeaveRequestsPage';
import AdminLeaveRequestsPage from '../pages/leave-requests/AdminLeaveRequestsPage';
import UsersPage from '../pages/users/UsersPage';
import UserProfilePage from '../pages/users/UserProfilePage';
import ReportsPage from '../pages/reports/ReportsPage';
import ParkingPage from '../pages/parking/ParkingPage';
import HandicapParkingPage from '../pages/parking/HandicapParkingPage';
import DomiciliuParkingPage from '../pages/parking/DomiciliuParkingPage';
import AdminEditRequestsPage from '../pages/parking/AdminEditRequestsPage';
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
        element={<Navigate to="/login" replace />}
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

        {/* Shift Swaps - for all users */}
        <Route path="/shift-swaps" element={<ShiftSwapsPage />} />

        {/* Admin Shift Swaps */}
        <Route
          path="/admin/shift-swaps"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminShiftSwapsPage />
            </ProtectedRoute>
          }
        />

        {/* Leave Requests - for all users */}
        <Route path="/leave-requests" element={<LeaveRequestsPage />} />

        {/* Admin Leave Requests */}
        <Route
          path="/admin/leave-requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminLeaveRequestsPage />
            </ProtectedRoute>
          }
        />

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

        <Route
          path="/schedules/rejected"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <RejectedSchedulesPage />
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

        {/* Reports - Admin only */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route path="/profile" element={<UserProfilePage />} />

        {/* Parking - Dispecerat, Manager, Admin */}
        <Route path="/parking" element={<ParkingPage />} />

        {/* Handicap Parking - Întreținere Parcări, Parcări Handicap, Parcări Domiciliu, Admin */}
        <Route path="/parking/handicap" element={<HandicapParkingPage />} />

        {/* Domiciliu Parking - Întreținere Parcări, Parcări Handicap, Parcări Domiciliu, Admin */}
        <Route path="/parking/domiciliu" element={<DomiciliuParkingPage />} />

        {/* Admin Edit Requests */}
        <Route
          path="/admin/edit-requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminEditRequestsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />

      {/* 404 - redirect to dashboard if authenticated, otherwise to login */}
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default AppRoutes;
