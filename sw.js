const CACHE = 'divvy-v6';

self.addEventListener('install', e => {
  e.waitUntil(
    self.skipWaiting()
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Navigation: cache the page and serve it
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Cache a fresh copy every time we have internet
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request.url, clone));
          return res;
        })
        .catch(() => {
          // Offline — serve from cache
          return caches.match(e.request.url)
            .then(cached => cached || caches.match(self.registration.scope + 'index.html'))
            .then(cached => cached || new Response('Offline - please open with internet first', {
              status: 503, headers: { 'Content-Type': 'text/plain' }
            }));
        })
    );
    return;
  }

  // All other resources
  e.respondWith(
    caches.match(e.request.url).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request.url, res.clone()));
        }
        return res;
      }).catch(() => new Response('', { status: 408 }));
    })
  );
});