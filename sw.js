/* ─────────────────────────────────────────────
   ANAI Service Worker
   Offline-first caching strategy
───────────────────────────────────────────── */

const CACHE_NAME = 'anai-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-180.png',
  '/icons/splash.png',
  // Google Fonts - cached on first fetch via fetch handler
];

// ── Install: pre-cache core shell ─────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first with cache fallback ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin except Google Fonts
  if (request.method !== 'GET') return;

  // Google Fonts — cache-first
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Same-origin: network-first, fallback to cache
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
  }
});

// ── Background sync stub (for future API calls) ─
self.addEventListener('sync', (event) => {
  if (event.tag === 'anai-sync') {
    console.log('[SW] Background sync triggered');
  }
});

// ── Push notifications stub ────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'ANAI';
  const options = {
    body: data.body ?? 'Новое напоминание от ANAI',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: { url: data.url ?? '/' },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';
  event.waitUntil(clients.openWindow(targetUrl));
});
