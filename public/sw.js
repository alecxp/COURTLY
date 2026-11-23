const CACHE_NAME = 'courtly-shell-v1';
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('push', (event) => {
  let payload = { title: 'COURTLY', body: 'Hai un nuovo aggiornamento della squadra.', url: '/notifications' };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title || 'COURTLY', {
    body: payload.body || 'Hai un nuovo aggiornamento.',
    icon: '/courtly-icon.svg',
    badge: '/courtly-icon.svg',
    data: { url: payload.url || '/notifications' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) { await client.focus(); if ('navigate' in client) await client.navigate(url); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
