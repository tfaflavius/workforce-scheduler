/**
 * Route preloader — preloads page chunks on hover/focus for instant navigation.
 * Maps route paths to their dynamic import functions.
 */

const routeImports: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('../pages/dashboard/DashboardPage'),
  '/schedules': () => import('../pages/schedules/SchedulesPage'),
  '/my-schedule': () => import('../pages/schedules/MySchedulePage'),
  '/shift-swaps': () => import('../pages/shift-swaps/ShiftSwapsPage'),
  '/admin/shift-swaps': () => import('../pages/shift-swaps/AdminShiftSwapsPage'),
  '/leave-requests': () => import('../pages/leave-requests/LeaveRequestsPage'),
  '/admin/leave-requests': () => import('../pages/leave-requests/AdminLeaveRequestsPage'),
  '/users': () => import('../pages/users/UsersPage'),
  '/reports': () => import('../pages/reports/ReportsPage'),
  '/parking': () => import('../pages/parking/ParkingPage'),
  '/parking/handicap': () => import('../pages/parking/HandicapParkingPage'),
  '/parking/domiciliu': () => import('../pages/parking/DomiciliuParkingPage'),
  '/daily-reports': () => import('../pages/daily-reports/DailyReportsPage'),
  '/admin/edit-requests': () => import('../pages/parking/AdminEditRequestsPage'),
  '/profile': () => import('../pages/users/UserProfilePage'),
  '/notifications': () => import('../pages/notifications/NotificationsPage'),
  '/admin/pontaj': () => import('../pages/time-tracking/AdminTimeTrackingPage'),
  '/admin/permissions': () => import('../pages/permissions/PermissionsPage'),
  '/procese-verbale': () => import('../pages/departments/ProcesVerbalePage'),
  '/parcometre': () => import('../pages/departments/ParcometrePage'),
  '/achizitii': () => import('../pages/departments/AchizitiiPage'),
  '/incasari-cheltuieli': () => import('../pages/departments/IncasariCheltuieliPage'),
  '/control-sesizari': () => import('../pages/parking/ControlSesizariPage'),
};

const preloadedRoutes = new Set<string>();

/**
 * Preload a route's chunk. Safe to call multiple times —
 * will only trigger the import once per route.
 */
export function preloadRoute(path: string): void {
  if (preloadedRoutes.has(path)) return;

  const importFn = routeImports[path];
  if (importFn) {
    preloadedRoutes.add(path);
    // Use requestIdleCallback if available, otherwise setTimeout
    const schedule = 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback
      : (fn: () => void) => setTimeout(fn, 100);

    schedule(() => {
      importFn().catch(() => {
        // Remove from set so it can be retried
        preloadedRoutes.delete(path);
      });
    });
  }
}
