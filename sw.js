// Tennisans Dashboard Service Worker v5.2
// CRITICAL: Jangan intercept cross-origin requests (script.google.com, anthropic.com, dll)
// SW hanya handle static assets same-origin saja

const CACHE_NAME = 'tennisans-v5';
const STATIC_ASSETS = [
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  const origin = self.location.origin;

  // ── JANGAN intercept cross-origin requests sama sekali ──
  // GAS, Anthropic, Chart.js CDN, dll — biarkan browser handle langsung
  if (!url.startsWith(origin)) return;

  // ── Untuk same-origin: network-first (data selalu fresh) ──
  // Hanya cache Chart.js yang berat
  if (url.includes('chart.umd.min.js')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // index.html → network first, fallback to cache
  if (url === origin + '/' || url.endsWith('/index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Semua same-origin lainnya → network only (biarkan browser handle)
});
