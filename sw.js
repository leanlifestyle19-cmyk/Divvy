const CACHE = 'divvy-v5';

/* Install — cache index.html only, never fail */
self.addEventListener('install', e => {
  e.waitUntil(
    fetch('./index.html', { cache: 'reload' })
      .then(res => caches.open(CACHE).then(c => c.put('./index.html', res)))
      .catch(() => {}) // never block install
      .then(() => self.skipWaiting())
  );
});

/* Activate — clear old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch — serve from cache, update in background */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  /* Navigation (opening the app) → serve index.html from cache */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(cached => {
        const networkFetch = fetch(e.request)
          .then(res => {
            caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  /* Everything else — cache first, network fallback, cache the result */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});