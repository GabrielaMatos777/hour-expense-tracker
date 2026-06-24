// This Service Worker actively unregisters itself and clears all caches.
// It was added to undo the previous SW that was caching aggressively.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    }).then(() => self.registration.unregister())
  );
});
