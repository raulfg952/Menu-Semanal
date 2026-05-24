// ── MiMenú Service Worker ──
// Incrementa CACHE_VERSION con cada deploy para forzar actualización automática
const CACHE_VERSION = 'v6';
const CACHE_NAME = `mimenu-${CACHE_VERSION}`;

// Archivos a cachear para funcionamiento offline
const PRECACHE_URLS = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

// ── MESSAGE: forzar activación inmediata desde el cliente ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: eliminar cachés antiguas ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('mimenu-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // Toma control de todas las pestañas abiertas
  );
});

// ── FETCH: network-first con fallback a caché ──
self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET al mismo origen
  if (event.request.method !== 'GET') return;
  
  // No interceptar peticiones a APIs externas (Open Food Facts, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Actualizar caché con la respuesta más reciente
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Sin red: servir desde caché (modo offline)
        return caches.match(event.request)
          .then(cached => cached || caches.match('./index.html'));
      })
  );
});
