const CACHE_VERSION = 'ruqia-geo-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))))
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Do NOT cache anything — let all requests go to network fresh
self.addEventListener('fetch', () => {});
