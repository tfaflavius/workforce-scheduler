// Custom Service Worker for Push Notifications
// This service worker handles push notifications even when the app is closed

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

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [300, 100, 300, 100, 300], // Longer vibration pattern
    tag: data.tag || 'workschedule-' + Date.now(),
    renotify: true, // Always notify even if same tag
    requireInteraction: true, // Keep notification visible until user interacts (important for seeing it!)
    silent: false, // Make sound
    data: data.data || { url: '/dashboard' },
    actions: [
      { action: 'view', title: 'Deschide' },
      { action: 'close', title: 'Închide' },
    ],
    // Timestamp helps with notification ordering
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
