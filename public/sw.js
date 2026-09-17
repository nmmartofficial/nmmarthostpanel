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

// Let Supabase Auth, REST, and Realtime requests use the browser's normal network path.
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.hostname.endsWith('.supabase.co')) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Network unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});
