// Service Worker für Push-Benachrichtigungen („Du bist dran“).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Billiard-Tracker', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Billiard-Tracker', {
      body: data.body || '',
      icon: '/icons/192',
      badge: '/icons/192',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => 'focus' in w);
      if (!win) return self.clients.openWindow(url);
      return win
        .focus()
        .then((w) => (w && 'navigate' in w ? w.navigate(url) : null))
        .catch(() => self.clients.openWindow(url));
    }),
  );
});
