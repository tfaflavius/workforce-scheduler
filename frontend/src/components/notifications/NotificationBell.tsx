import React, { useState } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Stack,
  Button,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as ScheduleIcon,
  Update as UpdateIcon,
  AccessTime as ReminderIcon,
  SwapHoriz as SwapIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  DoneAll as DoneAllIcon,
  BeachAccess as LeaveIcon,
  LocalParking as ParkingIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  type Notification,
  type NotificationType,
} from '../../store/api/notifications.api';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'SCHEDULE_APPROVED':
      return <ApprovedIcon color="success" fontSize="small" />;
    case 'SCHEDULE_REJECTED':
      return <RejectedIcon color="error" fontSize="small" />;
    case 'SCHEDULE_CREATED':
      return <ScheduleIcon color="primary" fontSize="small" />;
    case 'SCHEDULE_UPDATED':
      return <UpdateIcon color="info" fontSize="small" />;
    case 'SHIFT_REMINDER':
      return <ReminderIcon color="warning" fontSize="small" />;
    case 'SHIFT_SWAP_REQUEST':
    case 'SHIFT_SWAP_RESPONSE':
    case 'SHIFT_SWAP_ACCEPTED':
    case 'SHIFT_SWAP_APPROVED':
    case 'SHIFT_SWAP_REJECTED':
      return <SwapIcon color="secondary" fontSize="small" />;
    case 'EMPLOYEE_ABSENT':
      return <WarningIcon color="error" fontSize="small" />;
    case 'LEAVE_REQUEST_CREATED':
      return <LeaveIcon color="info" fontSize="small" />;
    case 'LEAVE_REQUEST_APPROVED':
      return <LeaveIcon color="success" fontSize="small" />;
    case 'LEAVE_REQUEST_REJECTED':
      return <LeaveIcon color="error" fontSize="small" />;
    case 'LEAVE_OVERLAP_WARNING':
      return <WarningIcon color="warning" fontSize="small" />;
    case 'PARKING_ISSUE_ASSIGNED':
    case 'PARKING_ISSUE_RESOLVED':
      return <ParkingIcon color="primary" fontSize="small" />;
    case 'EDIT_REQUEST_CREATED':
      return <EditIcon color="warning" fontSize="small" />;
    case 'EDIT_REQUEST_APPROVED':
      return <EditIcon color="success" fontSize="small" />;
    case 'EDIT_REQUEST_REJECTED':
      return <EditIcon color="error" fontSize="small" />;
    default:
      return <InfoIcon color="action" fontSize="small" />;
  }
};

// Get navigation path based on notification type and data
const getNotificationPath = (notification: Notification): { path: string; state?: any } | null => {
  const { type, data } = notification;

  switch (type) {
    // Schedule notifications
    case 'SCHEDULE_CREATED':
    case 'SCHEDULE_UPDATED':
    case 'SCHEDULE_APPROVED':
    case 'SCHEDULE_REJECTED':
      if (data?.scheduleId) {
        return { path: `/schedules/${data.scheduleId}` };
      }
      return { path: '/schedules' };

    // Shift swap notifications
    case 'SHIFT_SWAP_REQUEST':
    case 'SHIFT_SWAP_RESPONSE':
    case 'SHIFT_SWAP_ACCEPTED':
    case 'SHIFT_SWAP_APPROVED':
    case 'SHIFT_SWAP_REJECTED':
      return { path: '/shift-swaps' };

    // Leave request notifications
    case 'LEAVE_REQUEST_CREATED':
    case 'LEAVE_REQUEST_APPROVED':
    case 'LEAVE_REQUEST_REJECTED':
    case 'LEAVE_OVERLAP_WARNING':
      return { path: '/leave-requests' };

    // Parking notifications - navigate to specific item
    case 'PARKING_ISSUE_ASSIGNED':
    case 'PARKING_ISSUE_RESOLVED':
      // Check which type of parking notification it is
      if (data?.issueId) {
        return { path: '/parking', state: { openIssueId: data.issueId } };
      }
      if (data?.damageId) {
        return { path: '/parking', state: { openDamageId: data.damageId, tab: 1 } };
      }
      if (data?.handicapRequestId) {
        return { path: '/parking/handicap', state: { openRequestId: data.handicapRequestId } };
      }
      if (data?.domiciliuRequestId) {
        return { path: '/parking/domiciliu', state: { openRequestId: data.domiciliuRequestId } };
      }
      if (data?.handicapLegitimationId) {
        return { path: '/parking/handicap', state: { openLegitimationId: data.handicapLegitimationId, tab: 3 } };
      }
      return { path: '/parking' };

    // Edit request notifications
    case 'EDIT_REQUEST_CREATED':
      return { path: '/admin/edit-requests' };
    case 'EDIT_REQUEST_APPROVED':
    case 'EDIT_REQUEST_REJECTED':
      return { path: '/parking' };

    // Shift reminder
    case 'SHIFT_REMINDER':
      return { path: '/my-schedule' };

    // Employee absent
    case 'EMPLOYEE_ABSENT':
      return { path: '/schedules' };

    default:
      return null;
  }
};

// Check if notification is navigable
const isNotificationNavigable = (notification: Notification): boolean => {
  return getNotificationPath(notification) !== null;
};

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Acum';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} ore`;
  if (diffDays < 7) return `${diffDays} zile`;
  return date.toLocaleDateString('ro-RO');
};

export const NotificationBell: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Poll pentru notificări la fiecare 30 secunde
  const { data: notifications = [], isLoading } = useGetNotificationsQuery(
    { limit: 10 },
    { pollingInterval: 30000 }
  );
  const { data: unreadCount = 0 } = useGetUnreadCountQuery(
    undefined,
    { pollingInterval: 30000 }
  );
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to relevant page based on notification type
    const navInfo = getNotificationPath(notification);
    if (navInfo) {
      navigate(navInfo.path, { state: navInfo.state });
    }

    handleClose();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        aria-label={`${unreadCount} notificări necitite`}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 380 },
            maxWidth: { xs: '100vw', sm: 380 },
            maxHeight: { xs: '70vh', sm: 520 },
            borderRadius: { xs: 0, sm: 2 },
            mt: { xs: 0, sm: 1 },
            boxShadow: theme.shadows[8],
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight="bold">
              Notificari
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllRead}
                sx={{ textTransform: 'none' }}
              >
                Marcheaza citite
              </Button>
            )}
          </Stack>
        </Box>

        {/* Notifications List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Nu ai notificari
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => {
            const isNavigable = isNotificationNavigable(notification);
            return (
              <Tooltip
                key={notification.id}
                title={isNavigable ? 'Click pentru a vizualiza' : ''}
                placement="left"
                arrow
              >
                <MenuItem
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: notification.isRead
                      ? 'transparent'
                      : alpha(theme.palette.primary.main, 0.08),
                    transition: 'all 0.2s ease',
                    cursor: isNavigable ? 'pointer' : 'default',
                    '&:hover': {
                      bgcolor: notification.isRead
                        ? alpha(theme.palette.action.hover, 0.8)
                        : alpha(theme.palette.primary.main, 0.15),
                      transform: isNavigable ? 'translateX(4px)' : 'none',
                    },
                    '&:active': {
                      transform: isNavigable ? 'scale(0.99)' : 'none',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography
                          variant="body2"
                          fontWeight={notification.isRead ? 'normal' : 'bold'}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {notification.title}
                        </Typography>
                        {isNavigable && (
                          <OpenInNewIcon
                            sx={{
                              fontSize: 14,
                              color: 'text.disabled',
                              opacity: 0.7,
                            }}
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {getTimeAgo(notification.createdAt)}
                        </Typography>
                      </Stack>
                    }
                  />
                  {!notification.isRead && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        ml: 1,
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                        },
                      }}
                    />
                  )}
                </MenuItem>
              </Tooltip>
            );
          })
        )}

        {/* Footer - show if there are notifications */}
        {notifications.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ textAlign: 'center', cursor: 'pointer' }}
              onClick={handleClose}
            >
              Vezi toate notificarile
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
