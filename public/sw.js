// draftr PWA Service Worker
const CACHE_NAME = 'draftr-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network first: always get fresh updates, fallback to cache only if offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
