const CACHE = 'mimenu-v2';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
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
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) {
        // Devolver caché inmediatamente y actualizar en background
        fetch(e.request).then(resp => {
          if(resp && resp.status === 200)
            caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200)
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        return resp;
      }).catch(() => new Response('Sin conexión', {status: 503}));
    })
  );
});
