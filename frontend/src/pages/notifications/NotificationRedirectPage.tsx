import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAppSelector } from '../../store/hooks';
import { useGetNotificationByIdQuery, useMarkAsReadMutation } from '../../store/api/notifications.api';
import { getNotificationPath } from '../../utils/notificationHelpers';

/**
 * NotificationRedirectPage — handles deep linking from push notifications.
 * When a push notification is clicked, the service worker navigates to
 * /notification-redirect/:id. This page fetches the notification,
 * marks it as read, and redirects to the appropriate page with state.
 */
const NotificationRedirectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const userRole = user?.role;
  const [markAsRead] = useMarkAsReadMutation();
  const hasNavigated = useRef(false);

  const { data: notification, isError } = useGetNotificationByIdQuery(id!, {
    skip: !id,
  });

  useEffect(() => {
    if (notification && !hasNavigated.current) {
      hasNavigated.current = true;

      // Mark as read
      if (!notification.isRead) {
        markAsRead(notification.id);
      }

      // Navigate to the target page with state
      const navInfo = getNotificationPath(notification, userRole);
      if (navInfo) {
        navigate(navInfo.path, { state: navInfo.state, replace: true });
      } else {
        navigate('/notifications', { replace: true });
      }
    }
  }, [notification, userRole, navigate, markAsRead]);

  useEffect(() => {
    if (isError && !hasNavigated.current) {
      hasNavigated.current = true;
      // Notification not found or unauthorized — go to notifications list
      navigate('/notifications', { replace: true });
    }
  }, [isError, navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <CircularProgress />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Se incarca notificarea...
      </Typography>
    </Box>
  );
};

export default NotificationRedirectPage;
