// Custom Service Worker for Push Notifications + Background GPS Capture
// This service worker handles push notifications even when the app is closed

// API URL for backend communication
const API_BASE = self.location.origin.includes('localhost')
  ? 'http://localhost:3000/api'
  : 'https://workforce-scheduler.onrender.com/api';

// Background GPS capture - triggered by silent push from backend
async function captureGPSInBackground(pushData) {
  const timeEntryId = pushData.timeEntryId;
  const userId = pushData.userId;

  if (!timeEntryId || !userId) {
    console.warn('[SW-GPS] Missing timeEntryId or userId, skipping capture');
    return;
  }

  try {
    // Service workers can use geolocation via clients
    // Try to get position from an open client first
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

    if (allClients.length > 0) {
      // Send message to any open client to capture GPS
      const client = allClients[0];
      client.postMessage({
        type: 'GPS_CAPTURE_REQUEST',
        timeEntryId,
        userId,
      });
      console.log('[SW-GPS] Sent GPS capture request to open client');
    } else {
      console.log('[SW-GPS] No open clients, cannot capture GPS in background');
      // On most mobile browsers, service workers don't have access to geolocation API
      // The push will at least wake the device; we show a silent notification that auto-closes
    }
  } catch (err) {
    console.error('[SW-GPS] Background GPS capture failed:', err);
  }
}

// Handle push events - this is critical for background notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let data = {
    title: 'WorkSchedule',
    body: 'Ai o notificare nouă',
    data: { url: '/dashboard' },
  };

  if (event.data) {
    try {
      data = event.data.json();
      console.log('[SW] Push data:', JSON.stringify(data));
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  // Check if this is a silent GPS capture push
  if (data.data && data.data.action === 'GPS_CAPTURE') {
    console.log('[SW-GPS] GPS capture push received for timeEntry:', data.data.timeEntryId);
    event.waitUntil(
      captureGPSInBackground(data.data)
        .then(() => {
          // Show a minimal silent notification (required by browsers for push events)
          return self.registration.showNotification('GPS', {
            body: 'Locatia se inregistreaza...',
            icon: '/icons/icon-192x192.png',
            tag: 'gps-capture', // Same tag = replaces previous, no spam
            renotify: false,
            silent: true,
            requireInteraction: false,
            data: { action: 'GPS_SILENT', url: '/dashboard' },
          });
        })
        .then(() => {
          // Auto-close the notification after 2 seconds
          return new Promise(resolve => setTimeout(resolve, 2000));
        })
        .then(() => {
          return self.registration.getNotifications({ tag: 'gps-capture' });
        })
        .then(notifications => {
          notifications.forEach(n => n.close());
        })
    );
    return;
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || 'workschedule-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: data.data || { url: '/dashboard' },
    actions: [
      { action: 'view', title: 'Deschide' },
      { action: 'close', title: 'Închide' },
    ],
    timestamp: data.timestamp || Date.now(),
  };

  // CRITICAL: waitUntil keeps service worker alive until notification is shown
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[SW] Notification displayed successfully'))
      .catch(err => console.error('[SW] Failed to show notification:', err))
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/dashboard';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.navigate(fullUrl).then(() => client.focus());
          }
        }
        // Open a new window if no existing window found
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed by user');
});

// Handle subscription change (when subscription expires or is revoked)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed, resubscribing...');

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY
    })
      .then((subscription) => {
        console.log('[SW] New subscription obtained');
        // Send the new subscription to the server
        return fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      })
      .catch(err => console.error('[SW] Resubscription failed:', err))
  );
});

// Keep service worker active
self.addEventListener('install', (event) => {
  console.log('[SW] Push service worker installing...');
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Push service worker activated');
  event.waitUntil(clients.claim()); // Take control of all pages immediately
});

console.log('[SW] Push service worker loaded');
