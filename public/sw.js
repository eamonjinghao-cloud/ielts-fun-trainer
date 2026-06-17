// IELTS Fun Trainer Service Worker
// Caches app shell for offline access and fast repeat loads

const CACHE_NAME = 'ielts-fun-trainer-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Don't cache API calls or Next.js internal requests
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('_next/webpack') ||
    event.request.url.includes('_next/static/development')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached response if available
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful GET responses for static assets
        if (
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback - return cached home page
        return caches.match('/');
      });
    })
  );
});
