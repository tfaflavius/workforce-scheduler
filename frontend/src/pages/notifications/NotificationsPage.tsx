import React, { useState, useMemo } from 'react';
import { getTimeAgo } from '../../utils/getTimeAgo';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  alpha,
  useTheme,
  Fade,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  FilterList as FilterIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/common';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllReadMutation,
  type Notification,
  type NotificationType,
} from '../../store/api/notifications.api';
import { useAppSelector } from '../../store/hooks';
import { GradientHeader } from '../../components/common/GradientHeader';
import { getNotificationIcon, getNotificationPath, isNotificationNavigable } from '../../utils/notificationHelpers';

const getCategoryFromType = (type: NotificationType): string => {
  if (type.startsWith('SCHEDULE')) return 'Programe';
  if (type.startsWith('SHIFT_SWAP') || type === 'SHIFT_REMINDER') return 'Schimburi Ture';
  if (type.startsWith('LEAVE')) return 'Concedii';
  if (type.startsWith('PARKING') || type.startsWith('EDIT_REQUEST')) return 'Parcari';
  if (type.startsWith('DAILY_REPORT')) return 'Rapoarte Zilnice';
  if (type === 'EMPLOYEE_ABSENT') return 'Prezenta';
  return 'General';
};

const NotificationsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const userRole = user?.role;
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useGetNotificationsQuery(
    { limit: 100, unreadOnly: filter === 'unread' },
    { pollingInterval: 30000 }
  );
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [deleteAllRead] = useDeleteAllReadMutation();

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  // Group notifications by date
  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    notifications.forEach((n) => {
      const date = new Date(n.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Astazi';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Ieri';
      } else {
        key = date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return groups;
  }, [notifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to the relevant page based on notification type and user role
    const navInfo = getNotificationPath(notification, userRole);
    if (navInfo) {
      navigate(navInfo.path, { state: navInfo.state });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
        {/* Header skeleton */}
        <Skeleton variant="rounded" height={100} sx={{ mb: 3, borderRadius: 3 }} />
        {/* Actions bar skeleton */}
        <Skeleton variant="rounded" height={64} sx={{ mb: 3, borderRadius: 2 }} />
        {/* Notification cards skeleton */}
        <Skeleton variant="rounded" width={120} height={20} sx={{ mb: 1.5 }} />
        <Stack spacing={1}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: { xs: 0, sm: 1 } }}>
      <GradientHeader
        title="Notificari"
        subtitle={`${unreadCount} necitite din ${notifications.length} total`}
        icon={<NotificationsIcon />}
        gradient="#7c3aed 0%, #2563eb 100%"
      />

      {/* Actions Bar */}
      <Fade in={true} timeout={400}>
        <Card sx={{ mb: { xs: 2, sm: 3 } }}>
          <CardContent sx={{ py: 1.5, px: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={1.5}
            >
              <ToggleButtonGroup
                value={filter}
                exclusive
                onChange={(_, v) => v && setFilter(v)}
                size="small"
              >
                <ToggleButton value="all" sx={{ textTransform: 'none', fontSize: '0.8rem', px: 2 }}>
                  <FilterIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  Toate
                </ToggleButton>
                <ToggleButton value="unread" sx={{ textTransform: 'none', fontSize: '0.8rem', px: 2 }}>
                  Necitite
                  {unreadCount > 0 && (
                    <Chip
                      label={unreadCount}
                      size="small"
                      color="primary"
                      sx={{ ml: 0.5, height: 18, minWidth: 18, '& .MuiChip-label': { px: 0.5 }, fontSize: '0.65rem' }}
                    />
                  )}
                </ToggleButton>
              </ToggleButtonGroup>

              <Stack direction="row" spacing={1}>
                {unreadCount > 0 && (
                  <Button
                    size="small"
                    startIcon={<DoneAllIcon />}
                    onClick={() => markAllAsRead()}
                    sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                  >
                    Marcheaza toate citite
                  </Button>
                )}
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={() => deleteAllRead()}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Sterge citite
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Fade>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={<NotificationsIcon />}
          title={filter === 'unread' ? 'Nu ai notificari necitite' : 'Nu ai notificari'}
          description={filter === 'unread' ? 'Toate notificarile tale au fost citite.' : 'Momentan nu ai nicio notificare.'}
          illustration="noNotifications"
        />
      ) : (
        Object.entries(grouped).map(([dateLabel, notifs], groupIdx) => (
          <Fade key={dateLabel} in={true} timeout={500 + groupIdx * 100}>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {dateLabel} ({notifs.length})
              </Typography>
              <Stack spacing={1}>
                {notifs.map((notif) => {
                  const category = getCategoryFromType(notif.type);
                  const navigable = isNotificationNavigable(notif, userRole);
                  return (
                    <Card
                      key={notif.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNotificationClick(notif);
                        }
                      }}
                      sx={{
                        cursor: navigable ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        bgcolor: notif.isRead ? 'background.paper' : alpha(theme.palette.primary.main, 0.04),
                        borderLeft: notif.isRead ? 'none' : `3px solid ${theme.palette.primary.main}`,
                        '&:hover': {
                          boxShadow: navigable ? theme.shadows[3] : theme.shadows[1],
                          transform: navigable ? 'translateX(2px)' : 'none',
                        },
                      }}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Box sx={{ pt: 0.25 }}>
                            {getNotificationIcon(notif.type)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                              <Typography
                                variant="body2"
                                fontWeight={notif.isRead ? 500 : 700}
                                noWrap
                                sx={{ flex: 1 }}
                              >
                                {notif.title}
                              </Typography>
                              {navigable && (
                                <OpenInNewIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                              )}
                              <Chip
                                label={category}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  flexShrink: 0,
                                }}
                              />
                            </Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.5,
                              }}
                            >
                              {notif.message}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
                              {getTimeAgo(notif.createdAt)}
                            </Typography>
                          </Box>
                          <Tooltip title="Sterge">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          </Fade>
        ))
      )}
    </Box>
  );
};

export default React.memo(NotificationsPage);
