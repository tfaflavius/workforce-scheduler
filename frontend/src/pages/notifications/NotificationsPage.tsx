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
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
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
  Description as DailyReportIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllReadMutation,
  type Notification,
  type NotificationType,
} from '../../store/api/notifications.api';
import { GradientHeader } from '../../components/common/GradientHeader';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'SCHEDULE_APPROVED': return <ApprovedIcon color="success" />;
    case 'SCHEDULE_REJECTED': return <RejectedIcon color="error" />;
    case 'SCHEDULE_CREATED': return <ScheduleIcon color="primary" />;
    case 'SCHEDULE_UPDATED': return <UpdateIcon color="info" />;
    case 'SHIFT_REMINDER': return <ReminderIcon color="warning" />;
    case 'SHIFT_SWAP_REQUEST':
    case 'SHIFT_SWAP_RESPONSE':
    case 'SHIFT_SWAP_ACCEPTED':
    case 'SHIFT_SWAP_APPROVED':
    case 'SHIFT_SWAP_REJECTED': return <SwapIcon color="secondary" />;
    case 'EMPLOYEE_ABSENT': return <WarningIcon color="error" />;
    case 'LEAVE_REQUEST_CREATED': return <LeaveIcon color="info" />;
    case 'LEAVE_REQUEST_APPROVED': return <LeaveIcon color="success" />;
    case 'LEAVE_REQUEST_REJECTED': return <LeaveIcon color="error" />;
    case 'LEAVE_OVERLAP_WARNING': return <WarningIcon color="warning" />;
    case 'PARKING_ISSUE_ASSIGNED':
    case 'PARKING_ISSUE_RESOLVED': return <ParkingIcon color="primary" />;
    case 'EDIT_REQUEST_CREATED': return <EditIcon color="warning" />;
    case 'EDIT_REQUEST_APPROVED': return <EditIcon color="success" />;
    case 'EDIT_REQUEST_REJECTED': return <EditIcon color="error" />;
    case 'DAILY_REPORT_SUBMITTED': return <DailyReportIcon color="info" />;
    case 'DAILY_REPORT_COMMENTED': return <DailyReportIcon color="success" />;
    case 'DAILY_REPORT_MISSING': return <DailyReportIcon color="error" />;
    default: return <InfoIcon color="action" />;
  }
};

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
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useGetNotificationsQuery(
    { limit: 100, unreadOnly: filter === 'unread' },
    { pollingInterval: 30000 }
  );
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [deleteAllRead] = useDeleteAllReadMutation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
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
        <Fade in={true} timeout={500}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {filter === 'unread' ? 'Nu ai notificari necitite' : 'Nu ai notificari'}
            </Typography>
          </Box>
        </Fade>
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
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        bgcolor: notif.isRead ? 'background.paper' : alpha(theme.palette.primary.main, 0.04),
                        borderLeft: notif.isRead ? 'none' : `3px solid ${theme.palette.primary.main}`,
                        '&:hover': {
                          boxShadow: theme.shadows[3],
                          transform: 'translateX(2px)',
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

export default NotificationsPage;
