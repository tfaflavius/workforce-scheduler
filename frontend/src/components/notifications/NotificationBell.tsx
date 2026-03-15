import React, { useState, useCallback } from 'react';
import { getTimeAgo } from '../../utils/getTimeAgo';
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
  DoneAll as DoneAllIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  type Notification,
} from '../../store/api/notifications.api';
import { useAppSelector } from '../../store/hooks';
import { getNotificationIcon, getNotificationPath, isNotificationNavigable } from '../../utils/notificationHelpers';

export const NotificationBell: React.FC = React.memo(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const userRole = user?.role;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Poll pentru notificari la fiecare 30 secunde
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

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to relevant page based on notification type and user role
    const navInfo = getNotificationPath(notification, userRole);
    if (navInfo) {
      navigate(navInfo.path, { state: navInfo.state });
    }

    handleClose();
  }, [markAsRead, navigate, userRole, handleClose]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleViewAll = useCallback(() => {
    handleClose();
    navigate('/notifications');
  }, [handleClose, navigate]);

  return (
    <>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} notificari necitite` : 'Notificari'}>
        <IconButton
          color="inherit"
          onClick={handleOpen}
          aria-label={`${unreadCount} notificari necitite`}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': unreadCount > 0 ? {
                animation: 'badgePulse 2s ease-in-out infinite',
                boxShadow: `0 0 8px ${alpha(theme.palette.error.main, 0.5)}, 0 0 16px ${alpha(theme.palette.error.main, 0.2)}`,
                '@keyframes badgePulse': {
                  '0%, 100%': { transform: 'scale(1) translate(50%, -50%)' },
                  '50%': { transform: 'scale(1.15) translate(50%, -50%)' },
                },
              } : {},
            }}
          >
            {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 380 },
            maxWidth: { xs: '100vw', sm: 380 },
            maxHeight: { xs: '70vh', sm: 520 },
            borderRadius: { xs: 0, sm: 3 },
            mt: { xs: 0, sm: 1 },
            boxShadow: theme.palette.mode === 'light'
              ? '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)'
              : '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            ...(theme.palette.mode === 'dark' && {
              backgroundColor: alpha(theme.palette.background.paper, 0.85),
            }),
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
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <NotificationsNoneIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.6 }} />
            </Box>
            <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
              Totul e in ordine!
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Nu ai notificari noi momentan.
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => {
            const isNavigable = isNotificationNavigable(notification, userRole);
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
                    {getNotificationIcon(notification.type, 'small')}
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
                        boxShadow: `0 0 6px ${alpha(theme.palette.primary.main, 0.6)}`,
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
              role="button"
              tabIndex={0}
              sx={{ textAlign: 'center', cursor: 'pointer', fontWeight: 600 }}
              onClick={handleViewAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleViewAll();
                }
              }}
            >
              Vezi toate notificarile
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
});

NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;
