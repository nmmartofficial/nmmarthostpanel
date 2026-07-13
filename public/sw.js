// NM MART - Cache Reset Service Worker
const CACHE_NAME = 'nm-mart-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// Bypass caching for all requests to prevent MIME type errors
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
