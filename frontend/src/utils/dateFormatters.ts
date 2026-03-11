/**
 * Shared date / time formatting helpers.
 * Consolidates duplicate formatDate, formatTime, formatDuration, etc.
 * that were duplicated across many page components.
 *
 * All formatters use the 'ro-RO' locale.
 */

/**
 * Format a date string as "dd.MM.yyyy" (e.g. "15.03.2024").
 * Used by: AdminTimeTracking, AchizitiiPage, ParkingReportsTab, etc.
 */
export const formatDateShort = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format a date string as "dd.MM.yyyy, HH:mm" (date + time).
 * Used by: ParkingDamagesTab, AdminEditRequestsPage, IssueDetailsDialog,
 *          DamageDetailsDialog, CashCollectionsTab, etc.
 */
export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a date string showing only day/month + time (no year).
 * Used by: ParkingIssuesTab, MaintenanceIssuesTab.
 */
export const formatDateTimeNoYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a date string as a long Romanian date (e.g. "luni, 15 martie 2024").
 * Used by: DailyReportsPage.
 */
export const formatDateLong = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format a date string with long weekday + day + long month (e.g. "luni, 15 martie 2024").
 * Used by: ShiftSwapsPage.
 */
export const formatDateFull = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format a date string with short weekday + day + short month (e.g. "lun., 15 mar. 2024").
 * Used by: AdminShiftSwapsPage.
 */
export const formatDateMedium = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format a date string as "day month_long year" (e.g. "15 martie 2024").
 * Used by: LeaveRequestsPage.
 */
export const formatDateDayMonthYear = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format a date string as "day month_short year" (e.g. "15 mar. 2024").
 * Used by: AdminLeaveRequestsPage.
 */
export const formatDateDayMonthShortYear = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format a date string as "dd.MM.yyyy" with null safety.
 * Returns '-' for null/undefined input.
 * Used by: AchizitiiPage.
 */
export const formatDateOrDash = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Format a datetime string to "HH:mm" (24h time only).
 * Uses toLocaleTimeString.
 * Used by: AdminTimeTrackingPage.
 */
export const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format a datetime string to "HH:MM" using manual padding.
 * Used by: EmployeeDashboard.
 */
export const formatTimeManual = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Format a duration given in minutes as "Xh Ym".
 * Returns '-' when the input is null or undefined.
 * Used by: AdminTimeTrackingPage.
 */
export const formatDuration = (minutes: number | null): string => {
  if (minutes == null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};
