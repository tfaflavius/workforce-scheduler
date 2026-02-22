import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../store/hooks';
import { Box, CircularProgress } from '@mui/material';
import {
  PROCESE_VERBALE_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
} from '../constants/departments';

// Lazy loaded route components
const SchedulesPage = lazy(() => import('../pages/schedules/SchedulesPage'));
const CreateSchedulePage = lazy(() => import('../pages/schedules/CreateSchedulePage'));
const BulkSchedulePage = lazy(() => import('../pages/schedules/BulkSchedulePage'));
const EditSchedulePage = lazy(() => import('../pages/schedules/EditSchedulePage'));
const PendingSchedulesPage = lazy(() => import('../pages/schedules/PendingSchedulesPage'));
const RejectedSchedulesPage = lazy(() => import('../pages/schedules/RejectedSchedulesPage'));
const MySchedulePage = lazy(() => import('../pages/schedules/MySchedulePage'));
const ShiftSwapsPage = lazy(() => import('../pages/shift-swaps/ShiftSwapsPage'));
const AdminShiftSwapsPage = lazy(() => import('../pages/shift-swaps/AdminShiftSwapsPage'));
const LeaveRequestsPage = lazy(() => import('../pages/leave-requests/LeaveRequestsPage'));
const AdminLeaveRequestsPage = lazy(() => import('../pages/leave-requests/AdminLeaveRequestsPage'));
const UsersPage = lazy(() => import('../pages/users/UsersPage'));
const UserProfilePage = lazy(() => import('../pages/users/UserProfilePage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const ParkingPage = lazy(() => import('../pages/parking/ParkingPage'));
const HandicapParkingPage = lazy(() => import('../pages/parking/HandicapParkingPage'));
const DomiciliuParkingPage = lazy(() => import('../pages/parking/DomiciliuParkingPage'));
const DailyReportsPage = lazy(() => import('../pages/daily-reports/DailyReportsPage'));
const AdminEditRequestsPage = lazy(() => import('../pages/parking/AdminEditRequestsPage'));
const AdminTimeTrackingPage = lazy(() => import('../pages/time-tracking/AdminTimeTrackingPage'));
const ProcesVerbalePage = lazy(() => import('../pages/departments/ProcesVerbalePage'));
const ParcometrePage = lazy(() => import('../pages/departments/ParcometrePage'));
const AchizitiiPage = lazy(() => import('../pages/departments/AchizitiiPage'));
const IncasariCheltuieliPage = lazy(() => import('../pages/departments/IncasariCheltuieliPage'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
    <CircularProgress />
  </Box>
);

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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes with MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - accessible by all authenticated users (not lazy - first page users see) */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* My Schedule - for employees */}
        <Route path="/my-schedule" element={<Suspense fallback={<PageLoader />}><MySchedulePage /></Suspense>} />

        {/* Shift Swaps - for all users */}
        <Route path="/shift-swaps" element={<Suspense fallback={<PageLoader />}><ShiftSwapsPage /></Suspense>} />

        {/* Admin Shift Swaps */}
        <Route
          path="/admin/shift-swaps"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><AdminShiftSwapsPage /></Suspense>
            </ProtectedRoute>
          }
        />

        {/* Daily Reports - for all users */}
        <Route path="/daily-reports" element={<Suspense fallback={<PageLoader />}><DailyReportsPage /></Suspense>} />

        {/* Leave Requests - for all users */}
        <Route path="/leave-requests" element={<Suspense fallback={<PageLoader />}><LeaveRequestsPage /></Suspense>} />

        {/* Admin Leave Requests */}
        <Route
          path="/admin/leave-requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><AdminLeaveRequestsPage /></Suspense>
            </ProtectedRoute>
          }
        />

        {/* Schedules */}
        <Route
          path="/schedules"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <Suspense fallback={<PageLoader />}><SchedulesPage /></Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/create"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <Suspense fallback={<PageLoader />}><CreateSchedulePage /></Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/bulk"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <Suspense fallback={<PageLoader />}><BulkSchedulePage /></Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/pending"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><PendingSchedulesPage /></Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/rejected"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><RejectedSchedulesPage /></Suspense>
            </ProtectedRoute>
          }
        />

        <Route path="/schedules/:id" element={<Suspense fallback={<PageLoader />}><EditSchedulePage /></Suspense>} />

        {/* Users */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><UsersPage /></Suspense>
            </ProtectedRoute>
          }
        />

        {/* Reports - Admin only */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route path="/profile" element={<Suspense fallback={<PageLoader />}><UserProfilePage /></Suspense>} />

        {/* Parking - Dispecerat, Manager, Admin */}
        <Route path="/parking" element={<Suspense fallback={<PageLoader />}><ParkingPage /></Suspense>} />

        {/* Handicap Parking - Intretinere Parcari, Parcari Handicap, Parcari Domiciliu, Admin */}
        <Route path="/parking/handicap" element={<Suspense fallback={<PageLoader />}><HandicapParkingPage /></Suspense>} />

        {/* Domiciliu Parking - Intretinere Parcari, Parcari Handicap, Parcari Domiciliu, Admin */}
        <Route path="/parking/domiciliu" element={<Suspense fallback={<PageLoader />}><DomiciliuParkingPage /></Suspense>} />

        {/* Admin Time Tracking */}
        <Route
          path="/admin/pontaj"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><AdminTimeTrackingPage /></Suspense>
            </ProtectedRoute>
          }
        />

        {/* Admin Edit Requests */}
        <Route
          path="/admin/edit-requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><AdminEditRequestsPage /></Suspense>
            </ProtectedRoute>
          }
        />

        {/* Procese Verbale - PVF, Control, Admin, Manager */}
        <Route
          path="/procese-verbale"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[PROCESE_VERBALE_DEPARTMENT_NAME, CONTROL_DEPARTMENT_NAME]}>
              <Suspense fallback={<PageLoader />}><ProcesVerbalePage /></Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/parcometre"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Suspense fallback={<PageLoader />}><ParcometrePage /></Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/achizitii"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[ACHIZITII_DEPARTMENT_NAME]}>
              <Suspense fallback={<PageLoader />}><AchizitiiPage /></Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/incasari-cheltuieli"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[ACHIZITII_DEPARTMENT_NAME]}>
              <Suspense fallback={<PageLoader />}><IncasariCheltuieliPage /></Suspense>
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
