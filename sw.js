const CACHE = 'horizon-v2';
const ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Fetch a request and return a Response guaranteed to be un-redirected —
// Safari refuses to let a service worker serve a response whose
// `.redirected` flag is true (e.g. a host 30x-ing "/" to "/index.html").
async function fetchClean(request) {
  const res = await fetch(request);
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(ASSETS.map(async (url) => {
        try {
          const res = await fetchClean(url);
          await cache.put(url, res);
        } catch (err) { /* asset unreachable, skip — fetch handler will retry live */ }
      }));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Navigations always resolve to the cached app shell (index.html), so a
// deep-linked reload (e.g. #/event/xyz) still works offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((cached) => cached || fetchClean(e.request).catch(() => cached))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetchClean(e.request)
        .then((res) => {
          if (res.ok && e.request.url.startsWith(self.location.origin)) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
