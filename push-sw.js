// Service worker dos lembretes (Web Push). O servidor (push-reminders e
// coach-checkin) manda { title, body, route, tag }; tocar abre o app na rota.
// O service worker do Flutter fica desligado (web/flutter_bootstrap.js): ele se
// desregistra sozinho e levaria a assinatura junto.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch (_) {
    m = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(m.title || 'UaiPlan', {
      body: m.body || '',
      icon: 'icons/uaiplan-192.png',
      badge: 'icons/uaiplan-maskable-192.png',
      tag: m.tag,
      renotify: Boolean(m.tag),
      data: { route: m.route || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = self.registration.scope + '#' + ((event.notification.data && event.notification.data.route) || '/');
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of open) {
        if (!c.url.startsWith(self.registration.scope)) continue;
        await c.focus();
        try {
          if ('navigate' in c) await c.navigate(url);
        } catch (_) {}
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
