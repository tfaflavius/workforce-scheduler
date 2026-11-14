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
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import BroadcastDialog from '../../components/notifications/BroadcastDialog';
import { useLocation, useNavigate } from 'react-router-dom';
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
  if (type === 'DAILY_DIGEST') return 'Rezumat';
  if (type === 'HOLIDAY_CHAT_MESSAGE') return 'Sarbatori';
  if (type === 'CHAT_MESSAGE') return 'Mesaje';
  return 'General';
};

const NotificationsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const canBroadcast = user?.role === 'ADMIN' || user?.role === 'MASTER_ADMIN';
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const userRole = user?.role;
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useGetNotificationsQuery(
    { limit: 100, unreadOnly: filter === 'unread' },
    { skipPollingIfUnfocused: true, pollingInterval: 30000 }
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

  // Notificarile fara pagina asociata se deschid pe loc, ca sa se vada tot textul
  const location = useLocation();
  const expandId = (location.state as { expandId?: string } | null)?.expandId;
  const [expandedSet, setExpanded] = useState<Set<string>>(new Set());
  // Notificarea deschisa din clopotel / push apare direct cu tot textul
  const expanded = useMemo(() => {
    if (!expandId) return expandedSet;
    const next = new Set(expandedSet);
    next.add(expandId);
    return next;
  }, [expandedSet, expandId]);
  const toggleExpanded = (id: string) => {
    if (expandId) navigate(location.pathname, { replace: true, state: null });
    setExpanded(() => {
      const next = new Set(expanded);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (!isNotificationNavigable(notification, userRole)) {
      toggleExpanded(notification.id);
      return;
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
      {canBroadcast && <BroadcastDialog open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />}
      <GradientHeader
        title="Notificari"
        subtitle={`${unreadCount} necitite din ${notifications.length} total`}
        icon={<NotificationsIcon />}
        gradient="#475569 0%, #2563eb 100%"
      />

      {/* Actions Bar */}
      <Fade in={true} timeout={400}>
        <Card sx={{ mb: { xs: 2, sm: 3 } }}>
          <CardContent sx={{ py: 1.5, px: 2 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', md: 'center' }}
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

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              >
                {canBroadcast && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CampaignIcon />}
                    onClick={() => setBroadcastOpen(true)}
                    sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                  >
                    Anunt catre toti
                  </Button>
                )}
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
          <Fade key={dateLabel} in={true} timeout={Math.min(500 + groupIdx * 100, 800)}>
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
                  const full =
                    notif.type === 'DAILY_DIGEST' || !!notif.data?.fullMessage || expanded.has(notif.id);
                  const longText = (notif.message?.length || 0) > 110 || notif.message?.includes('\n');
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
                        cursor: navigable || longText ? 'pointer' : 'default',
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
                                noWrap={!full}
                                sx={{ flex: 1, ...(full ? { wordBreak: 'break-word' } : {}) }}
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
                              sx={
                                full
                                  ? { display: 'block', whiteSpace: 'pre-line', lineHeight: 1.5, wordBreak: 'break-word' }
                                  : {
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: 1.5,
                                    }
                              }
                            >
                              {notif.message}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                {getTimeAgo(notif.createdAt)}
                              </Typography>
                              {!navigable && longText && notif.type !== 'DAILY_DIGEST' && !notif.data?.fullMessage && (
                                <Typography variant="caption" color="primary" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                                  {expanded.has(notif.id) ? 'Mai putin' : 'Citeste tot'}
                                </Typography>
                              )}
                            </Stack>
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
