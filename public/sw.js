/* ServiceFlow service worker — handles incoming Web Push notifications. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'ServiceFlow', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'ServiceFlow';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo192.png',
    badge: payload.badge || '/logo192.png',
    data: payload.data || {},
    tag: payload.data?.jobId ? `job-${payload.data.jobId}` : undefined,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = '/#/team-member/field-app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(target.replace('/#', '')) && 'focus' in w) return w.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
