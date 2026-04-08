import {
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as ScheduleIcon,
  Update as UpdateIcon,
  AccessTime as ReminderIcon,
  SwapHoriz as SwapIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BeachAccess as LeaveIcon,
  LocalParking as ParkingIcon,
  Edit as EditIcon,
  Description as DailyReportIcon,
  ReportProblem as ControlIcon,
  Receipt as PvIcon,
  Accessible as HandicapIcon,
  Home as DomiciliuIcon,
  Badge as LegitimationIcon,
  CarCrash as DamageIcon,
  GpsFixed as GpsIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import type { Notification, NotificationType } from '../store/api/notifications.api';
import { isAdminOrAbove } from './roleHelpers';

/**
 * Returns the appropriate MUI icon for a notification type.
 * Used by NotificationBell (small) and NotificationsPage (default size).
 */
export const getNotificationIcon = (type: NotificationType, size: 'small' | 'default' = 'default') => {
  const fontSize = size === 'small' ? 'small' as const : undefined;
  switch (type) {
    case 'SCHEDULE_APPROVED':
      return <ApprovedIcon color="success" fontSize={fontSize} />;
    case 'SCHEDULE_REJECTED':
      return <RejectedIcon color="error" fontSize={fontSize} />;
    case 'SCHEDULE_CREATED':
      return <ScheduleIcon color="primary" fontSize={fontSize} />;
    case 'SCHEDULE_UPDATED':
      return <UpdateIcon color="info" fontSize={fontSize} />;
    case 'SHIFT_REMINDER':
      return <ReminderIcon color="warning" fontSize={fontSize} />;
    case 'SHIFT_SWAP_REQUEST':
    case 'SHIFT_SWAP_RESPONSE':
    case 'SHIFT_SWAP_ACCEPTED':
    case 'SHIFT_SWAP_APPROVED':
    case 'SHIFT_SWAP_REJECTED':
      return <SwapIcon color="secondary" fontSize={fontSize} />;
    case 'EMPLOYEE_ABSENT':
      return <WarningIcon color="error" fontSize={fontSize} />;
    case 'LEAVE_REQUEST_CREATED':
      return <LeaveIcon color="info" fontSize={fontSize} />;
    case 'LEAVE_REQUEST_APPROVED':
      return <LeaveIcon color="success" fontSize={fontSize} />;
    case 'LEAVE_REQUEST_REJECTED':
      return <LeaveIcon color="error" fontSize={fontSize} />;
    case 'LEAVE_OVERLAP_WARNING':
      return <WarningIcon color="warning" fontSize={fontSize} />;
    case 'PARKING_ISSUE_ASSIGNED':
    case 'PARKING_ISSUE_RESOLVED':
      return <ParkingIcon color="primary" fontSize={fontSize} />;
    case 'PARKING_DAMAGE_ASSIGNED':
    case 'PARKING_DAMAGE_RESOLVED':
      return <DamageIcon color="error" fontSize={fontSize} />;
    case 'HANDICAP_REQUEST_ASSIGNED':
    case 'HANDICAP_REQUEST_RESOLVED':
      return <HandicapIcon color="info" fontSize={fontSize} />;
    case 'DOMICILIU_REQUEST_ASSIGNED':
    case 'DOMICILIU_REQUEST_RESOLVED':
      return <DomiciliuIcon color="primary" fontSize={fontSize} />;
    case 'LEGITIMATION_ASSIGNED':
    case 'LEGITIMATION_RESOLVED':
      return <LegitimationIcon color="secondary" fontSize={fontSize} />;
    case 'CONTROL_SESIZARE_ASSIGNED':
    case 'CONTROL_SESIZARE_RESOLVED':
      return <ControlIcon color="warning" fontSize={fontSize} />;
    case 'PV_SESSION_ASSIGNED':
    case 'PV_SESSION_UPDATED':
    case 'PV_SIGNING_ASSIGNED':
    case 'PV_SIGNING_UPDATED':
      return <PvIcon color="info" fontSize={fontSize} />;
    case 'EDIT_REQUEST_CREATED':
      return <EditIcon color="warning" fontSize={fontSize} />;
    case 'EDIT_REQUEST_APPROVED':
      return <EditIcon color="success" fontSize={fontSize} />;
    case 'EDIT_REQUEST_REJECTED':
      return <EditIcon color="error" fontSize={fontSize} />;
    case 'TIME_ENTRY_MISMATCH':
      return <TimerIcon color="warning" fontSize={fontSize} />;
    case 'GPS_STATUS_ALERT':
      return <GpsIcon color="error" fontSize={fontSize} />;
    case 'DAILY_REPORT_SUBMITTED':
      return <DailyReportIcon color="info" fontSize={fontSize} />;
    case 'DAILY_REPORT_COMMENTED':
      return <DailyReportIcon color="success" fontSize={fontSize} />;
    case 'DAILY_REPORT_MISSING':
      return <DailyReportIcon color="error" fontSize={fontSize} />;
    default:
      return <InfoIcon color="action" fontSize={fontSize} />;
  }
};

/**
 * Get navigation path based on notification type, data, and user role.
 * Returns { path, state? } for React Router navigation, or null if not navigable.
 */
export const getNotificationPath = (notification: Notification, userRole?: string): { path: string; state?: any } | null => {
  const { type, data } = notification;
  const isAdmin = isAdminOrAbove(userRole);
  const isManager = userRole === 'MANAGER';
  const isAdminOrManager = isAdmin || isManager;

  switch (type) {
    // Schedule notifications — navigate to correct month
    case 'SCHEDULE_CREATED':
    case 'SCHEDULE_UPDATED':
    case 'SCHEDULE_APPROVED':
    case 'SCHEDULE_REJECTED':
      return { path: isAdminOrManager ? '/schedules' : '/my-schedule', state: { highlightMonthYear: data?.monthYear } };

    // Shift swap notifications
    case 'SHIFT_SWAP_REQUEST':
      return { path: isAdmin ? '/admin/shift-swaps' : '/shift-swaps', state: { highlightSwapId: data?.swapRequestId } };
    case 'SHIFT_SWAP_RESPONSE':
    case 'SHIFT_SWAP_ACCEPTED':
    case 'SHIFT_SWAP_REJECTED':
      return { path: isAdmin ? '/admin/shift-swaps' : '/shift-swaps', state: { highlightSwapId: data?.swapRequestId } };
    case 'SHIFT_SWAP_APPROVED':
      return { path: isAdminOrManager ? '/schedules' : '/my-schedule' };

    // Leave request notifications
    case 'LEAVE_REQUEST_CREATED':
    case 'LEAVE_OVERLAP_WARNING':
      return { path: isAdmin ? '/admin/leave-requests' : '/leave-requests', state: { highlightRequestId: data?.leaveRequestId } };
    case 'LEAVE_REQUEST_APPROVED':
    case 'LEAVE_REQUEST_REJECTED':
      return { path: '/leave-requests', state: { highlightRequestId: data?.leaveRequestId } };

    // Parking issue notifications
    case 'PARKING_ISSUE_ASSIGNED':
    case 'PARKING_ISSUE_RESOLVED':
      return { path: '/parking', state: { openIssueId: data?.issueId } };

    // Parking damage notifications
    case 'PARKING_DAMAGE_ASSIGNED':
    case 'PARKING_DAMAGE_RESOLVED':
      return { path: '/parking', state: { openDamageId: data?.damageId, tab: 1 } };

    // Handicap parking request notifications
    case 'HANDICAP_REQUEST_ASSIGNED':
    case 'HANDICAP_REQUEST_RESOLVED':
      return { path: '/parking/handicap', state: { openRequestId: data?.handicapRequestId } };

    // Domiciliu parking request notifications
    case 'DOMICILIU_REQUEST_ASSIGNED':
    case 'DOMICILIU_REQUEST_RESOLVED':
      return { path: '/parking/domiciliu', state: { openRequestId: data?.domiciliuRequestId } };

    // Handicap legitimation notifications
    case 'LEGITIMATION_ASSIGNED':
    case 'LEGITIMATION_RESOLVED':
      return { path: '/parking/handicap', state: { openLegitimationId: data?.handicapLegitimationId, tab: 3 } };

    // Control sesizari notifications
    case 'CONTROL_SESIZARE_ASSIGNED':
    case 'CONTROL_SESIZARE_RESOLVED':
      return { path: '/control-sesizari', state: { openSesizareId: data?.controlSesizareId } };

    // PV Display session notifications
    case 'PV_SESSION_ASSIGNED':
    case 'PV_SESSION_UPDATED':
      return { path: '/procese-verbale', state: { openSessionId: data?.pvSessionId } };

    // PV Signing session notifications
    case 'PV_SIGNING_ASSIGNED':
    case 'PV_SIGNING_UPDATED':
      return { path: '/procese-verbale', state: { openSessionId: data?.pvSessionId } };

    // Edit request notifications
    case 'EDIT_REQUEST_CREATED':
      return { path: '/admin/edit-requests', state: { openEditRequestId: data?.editRequestId } };
    case 'EDIT_REQUEST_APPROVED':
    case 'EDIT_REQUEST_REJECTED':
      return { path: '/parking' };

    // Shift reminder
    case 'SHIFT_REMINDER':
      return { path: '/my-schedule' };

    // Employee absent
    case 'EMPLOYEE_ABSENT':
      return { path: '/schedules' };

    // Daily report notifications — navigate to the correct date and open the report
    case 'DAILY_REPORT_SUBMITTED':
    case 'DAILY_REPORT_COMMENTED':
      return { path: '/daily-reports', state: { highlightReportDate: data?.reportDate || data?.date, highlightReportId: data?.dailyReportId } };
    case 'DAILY_REPORT_MISSING':
      return { path: '/daily-reports', state: { highlightReportDate: data?.date } };

    default:
      // Fallback: check data for known entity IDs
      if (data?.pvSessionId || data?.pvDayId) {
        return { path: '/procese-verbale', state: { openSessionId: data?.pvSessionId } };
      }
      if (data?.controlSesizareId) {
        return { path: '/control-sesizari', state: { openSesizareId: data.controlSesizareId } };
      }
      return null;
  }
};

/**
 * Check if a notification is navigable (has a target page).
 */
export const isNotificationNavigable = (notification: Notification, userRole?: string): boolean => {
  return getNotificationPath(notification, userRole) !== null;
};
