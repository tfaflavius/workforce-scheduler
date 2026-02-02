// Custom Service Worker for Push Notifications

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'WorkSchedule',
    body: 'Ai o notificare nouă',
    data: { url: '/dashboard' },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    data: data.data || { url: '/dashboard' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open a new window if no existing window found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

// Handle subscription change (when subscription expires or is revoked)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed:', event);

  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        console.log('[SW] New subscription:', subscription);
        // Send the new subscription to the server
        return fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      })
  );
});

console.log('[SW] Push service worker loaded');
