import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import { RouteErrorBoundary } from '../components/RouteErrorBoundary';
import { useAppSelector } from '../store/hooks';
import { Box, Skeleton, Stack } from '@mui/material';
import {
  PROCESE_VERBALE_DEPARTMENT_NAME,
  CONTROL_DEPARTMENT_NAME,
  ACHIZITII_DEPARTMENT_NAME,
  PARCOMETRE_DEPARTMENT_NAME,
  MAINTENANCE_DEPARTMENT_NAME,
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
const ControlSesizariPage = lazy(() => import('../pages/parking/ControlSesizariPage'));
const PermissionsPage = lazy(() => import('../pages/permissions/PermissionsPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const NotificationRedirectPage = lazy(() => import('../pages/notifications/NotificationRedirectPage'));
const EquipmentStockPage = lazy(() => import('../pages/equipment-stock/EquipmentStockPage'));
const NotFoundPage = lazy(() => import('../pages/common/NotFoundPage'));

/** Skeleton placeholder shown while lazy-loaded pages are being fetched */
const PageLoader = () => (
  <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
    <Skeleton
      variant="rounded"
      sx={{
        height: { xs: 70, sm: 90, md: 110 },
        borderRadius: { xs: 2, sm: 3 },
        mb: { xs: 2, sm: 3 },
      }}
    />
    <Stack direction="row" spacing={2} sx={{ mb: { xs: 2, sm: 3 } }}>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" sx={{ flex: 1, height: { xs: 60, sm: 80 }, borderRadius: 2 }} />
      ))}
    </Stack>
    <Skeleton variant="rounded" sx={{ height: { xs: 180, sm: 250 }, borderRadius: 2 }} />
  </Box>
);

/** Wraps a lazy-loaded page component with RouteErrorBoundary + Suspense */
const SafePage = ({ children }: { children: ReactNode }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
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
        <Route path="/dashboard" element={<RouteErrorBoundary><DashboardPage /></RouteErrorBoundary>} />

        {/* My Schedule - for employees */}
        <Route path="/my-schedule" element={<SafePage><MySchedulePage /></SafePage>} />

        {/* Shift Swaps - for all users */}
        <Route path="/shift-swaps" element={<SafePage><ShiftSwapsPage /></SafePage>} />

        {/* Admin Shift Swaps */}
        <Route
          path="/admin/shift-swaps"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SafePage><AdminShiftSwapsPage /></SafePage>
            </ProtectedRoute>
          }
        />

        {/* Daily Reports - for all users */}
        <Route path="/daily-reports" element={<SafePage><DailyReportsPage /></SafePage>} />

        {/* Leave Requests - for all users */}
        <Route path="/leave-requests" element={<SafePage><LeaveRequestsPage /></SafePage>} />

        {/* Admin Leave Requests */}
        <Route
          path="/admin/leave-requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SafePage><AdminLeaveRequestsPage /></SafePage>
            </ProtectedRoute>
          }
        />

        {/* Schedules */}
        <Route
          path="/schedules"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <SafePage><SchedulesPage /></SafePage>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/create"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <SafePage><CreateSchedulePage /></SafePage>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/bulk"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <SafePage><BulkSchedulePage /></SafePage>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/pending"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SafePage><PendingSchedulesPage /></SafePage>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/rejected"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SafePage><RejectedSchedulesPage /></SafePage>
            </ProtectedRoute>
          }
        />

        <Route path="/schedules/:id" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'MASTER_ADMIN']}>
            <SafePage><EditSchedulePage /></SafePage>
          </ProtectedRoute>
        } />

        {/* Users */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SafePage><UsersPage /></SafePage>
            </ProtectedRoute>
          }
        />

        {/* Reports - Admin only */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SafePage><ReportsPage /></SafePage>
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route path="/profile" element={<SafePage><UserProfilePage /></SafePage>} />

        {/* Notifications - all authenticated users */}
        <Route path="/notifications" element={<SafePage><NotificationsPage /></SafePage>} />
        <Route path="/notification-redirect/:id" element={<SafePage><NotificationRedirectPage /></SafePage>} />

        {/* Parking - Dispecerat, Manager, Admin */}
        <Route path="/parking" element={<SafePage><ParkingPage /></SafePage>} />

        {/* Handicap Parking - Intretinere Parcari, Parcari Handicap, Parcari Domiciliu, Admin */}
        <Route path="/parking/handicap" element={<SafePage><HandicapParkingPage /></SafePage>} />

        {/* Domiciliu Parking - Intretinere Parcari, Parcari Handicap, Parcari Domiciliu, Admin */}
        <Route path="/parking/domiciliu" element={<SafePage><DomiciliuParkingPage /></SafePage>} />

        {/* Admin Time Tracking */}
        <Route
          path="/admin/pontaj"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SafePage><AdminTimeTrackingPage /></SafePage>
            </ProtectedRoute>
          }
        />

        {/* Admin Edit Requests */}
        <Route
          path="/admin/edit-requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SafePage><AdminEditRequestsPage /></SafePage>
            </ProtectedRoute>
          }
        />

        {/* Procese Verbale - PVF, Control, Intretinere Parcari, Admin, Manager */}
        <Route
          path="/procese-verbale"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[PROCESE_VERBALE_DEPARTMENT_NAME, CONTROL_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME]}>
              <SafePage><ProcesVerbalePage /></SafePage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/parcometre"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[PARCOMETRE_DEPARTMENT_NAME]}>
              <SafePage><ParcometrePage /></SafePage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/achizitii"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[ACHIZITII_DEPARTMENT_NAME]}>
              <SafePage><AchizitiiPage /></SafePage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/incasari-cheltuieli"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[ACHIZITII_DEPARTMENT_NAME]}>
              <SafePage><IncasariCheltuieliPage /></SafePage>
            </ProtectedRoute>
          }
        />
        {/* Admin Permissions */}
        <Route
          path="/admin/permissions"
          element={
            <ProtectedRoute allowedRoles={['MASTER_ADMIN']}>
              <SafePage><PermissionsPage /></SafePage>
            </ProtectedRoute>
          }
        />

        {/* Equipment Stock - Parcometre, Intretinere Parcari, Admin, Manager */}
        <Route
          path="/stoc-echipamente"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[PARCOMETRE_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME]}>
              <SafePage><EquipmentStockPage /></SafePage>
            </ProtectedRoute>
          }
        />

        <Route
          path="/control-sesizari"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'USER']} allowedDepartments={[CONTROL_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME]}>
              <SafePage><ControlSesizariPage /></SafePage>
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />

      {/* 404 page for authenticated users, redirect to login for unauthenticated */}
      {token ? (
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="*" element={<SafePage><NotFoundPage /></SafePage>} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
};

export default AppRoutes;
