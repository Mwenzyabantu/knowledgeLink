const CACHE_NAME = 'knowledgelink-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Skip cross-origin requests entirely
  if (!url.startsWith(self.location.origin)) return;

  // Skip SSE (Server-Sent Events) connections — must never be intercepted
  // as they are long-lived streaming connections for AI generation
  if (
    event.request.headers.get('Accept') === 'text/event-stream' ||
    url.includes('/generate-stream/')
  ) {
    return;
  }

  // For all other API calls: network-first, no cache fallback
  // (stale API data is worse than a network error)
  if (url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For static assets and app shell: cache-first, fall back to network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          // Cache successfully fetched static assets
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
  );
});
