import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Button,
  Alert,
  Stack,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  PhoneAndroid as PhoneIcon,
  Computer as DesktopIcon,
  Send as TestIcon,
} from '@mui/icons-material';
import {
  useGetVapidPublicKeyQuery,
  useGetPushStatusQuery,
  useSubscribeToPushMutation,
  useUnsubscribeFromPushMutation,
  useTestPushNotificationMutation,
  useClearAllPushSubscriptionsMutation,
} from '../../store/api/notifications.api';

// Helper to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export const PushNotificationSettings: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [currentSubscription, setCurrentSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: vapidData, refetch: refetchVapid } = useGetVapidPublicKeyQuery();
  const { data: pushStatus, refetch: refetchStatus } = useGetPushStatusQuery();
  const [subscribeToPush] = useSubscribeToPushMutation();
  const [unsubscribeFromPush] = useUnsubscribeFromPushMutation();
  const [testPush, { isLoading: testLoading }] = useTestPushNotificationMutation();
  const [clearAllSubscriptions] = useClearAllPushSubscriptionsMutation();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);

        // Check for existing subscription
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setCurrentSubscription(subscription);
        } catch (err) {
          console.error('Error checking subscription:', err);
        }
      }
    };

    checkSupport();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get VAPID key - try to refetch if not available
      let vapidKey = vapidData?.publicKey;
      if (!vapidKey) {
        const result = await refetchVapid();
        vapidKey = result.data?.publicKey;
      }

      if (!vapidKey) {
        setError('Nu s-a putut obține cheia VAPID. Reîncarcă pagina și încearcă din nou.');
        setLoading(false);
        return;
      }

      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Permisiunea pentru notificări a fost refuzată. Verifică setările browser-ului.');
        setLoading(false);
        return;
      }

      // Use the existing PWA service worker (which imports sw-push.js)
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        setError('Service worker nu este disponibil. Reîncarcă pagina.');
        setLoading(false);
        return;
      }

      // First, unsubscribe from any existing subscription to avoid conflicts
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
        console.log('[Push] Unsubscribed from existing subscription');
      }

      // Clear all subscriptions on server for this user (to remove old/invalid ones)
      try {
        await clearAllSubscriptions();
        console.log('[Push] Cleared all server subscriptions');
      } catch (e) {
        console.warn('[Push] Failed to clear server subscriptions:', e);
      }

      // Subscribe to push notifications with fresh subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      console.log('[Push] New subscription created:', subscription.endpoint.substring(0, 50));
      setCurrentSubscription(subscription);

      // Send subscription to server
      await subscribeToPush(subscription.toJSON() as PushSubscriptionJSON);
      await refetchStatus();

      setSuccess('Notificările push au fost activate cu succes!');
    } catch (err: any) {
      console.error('Error subscribing to push:', err);
      setError(err.message || 'Eroare la activarea notificărilor push');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!currentSubscription) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Unsubscribe from push
      await currentSubscription.unsubscribe();

      // Notify server
      await unsubscribeFromPush(currentSubscription.endpoint);

      setCurrentSubscription(null);
      await refetchStatus();

      setSuccess('Notificările push au fost dezactivate.');
    } catch (err: any) {
      console.error('Error unsubscribing from push:', err);
      setError(err.message || 'Eroare la dezactivarea notificărilor push');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setError(null);
    setSuccess(null);

    try {
      await testPush();
      setSuccess('Notificarea de test a fost trimisă! Verifică-ți dispozitivul.');
    } catch (err: any) {
      setError('Eroare la trimiterea notificării de test');
    }
  };

  const isSubscribed = currentSubscription !== null || pushStatus?.subscribed;

  if (!isSupported) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <NotificationsOffIcon color="disabled" />
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Notificări Push
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browser-ul tău nu suportă notificări push.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              {isSubscribed ? (
                <NotificationsActiveIcon color="primary" sx={{ fontSize: 32 }} />
              ) : (
                <NotificationsOffIcon color="disabled" sx={{ fontSize: 32 }} />
              )}
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Notificări Push
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Primește notificări chiar și când aplicația este închisă
                </Typography>
              </Box>
            </Stack>

            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <Switch
                checked={isSubscribed}
                onChange={isSubscribed ? handleUnsubscribe : handleSubscribe}
                color="primary"
              />
            )}
          </Stack>

          {/* Status */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              icon={<DesktopIcon />}
              label="Desktop"
              size="small"
              color={isSubscribed ? 'success' : 'default'}
              variant={isSubscribed ? 'filled' : 'outlined'}
            />
            <Chip
              icon={<PhoneIcon />}
              label="Mobile"
              size="small"
              color={isSubscribed ? 'success' : 'default'}
              variant={isSubscribed ? 'filled' : 'outlined'}
            />
            <Chip
              label={permission === 'granted' ? 'Permis' : permission === 'denied' ? 'Blocat' : 'Nesetat'}
              size="small"
              color={permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'default'}
            />
          </Stack>

          {/* Info Box */}
          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              <strong>Cum funcționează:</strong> După activare, vei primi notificări pe acest dispozitiv pentru:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              <li>Aprobări și respingeri de programe</li>
              <li>Cereri de schimb de tură</li>
              <li>Cereri de concediu</li>
              <li>Reminder-uri pentru ture</li>
            </Box>
          </Alert>

          {/* Alerts */}
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          {permission === 'denied' && (
            <Alert severity="warning">
              Notificările sunt blocate în browser. Pentru a le activa:
              <ol style={{ marginBottom: 0 }}>
                <li>Click pe iconița de lacăt din bara de adrese</li>
                <li>Găsește setarea "Notificări"</li>
                <li>Schimbă în "Permite"</li>
                <li>Reîncarcă pagina</li>
              </ol>
            </Alert>
          )}

          {/* Test Button */}
          {isSubscribed && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={testLoading ? <CircularProgress size={16} /> : <TestIcon />}
                onClick={handleTestNotification}
                disabled={testLoading}
                fullWidth
              >
                Trimite Notificare de Test
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={async () => {
                  setLoading(true);
                  await handleUnsubscribe();
                  setTimeout(() => handleSubscribe(), 500);
                }}
                disabled={loading}
              >
                Resetează
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PushNotificationSettings;
