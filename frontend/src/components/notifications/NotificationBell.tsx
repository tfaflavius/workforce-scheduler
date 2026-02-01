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
} from '@mui/icons-material';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  type Notification,
} from '../../store/api/notifications.api';

const getNotificationIcon = (type: Notification['type']) => {
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
    default:
      return <InfoIcon color="action" fontSize="small" />;
  }
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
    // Could navigate to relevant page based on notification type
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
            width: 360,
            maxHeight: 480,
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
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                py: 1.5,
                px: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                '&:hover': {
                  bgcolor: notification.isRead ? 'action.hover' : 'action.selected',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getNotificationIcon(notification.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    fontWeight={notification.isRead ? 'normal' : 'bold'}
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {notification.title}
                  </Typography>
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
                  }}
                />
              )}
            </MenuItem>
          ))
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
