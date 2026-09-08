const CACHE = 'horizon-v3';
const SHELL_FILES = ['index.html', 'styles.css', 'app.js', 'manifest.json'];
const STATIC_ASSETS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Fetch a request and return a Response guaranteed to be un-redirected:
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
      await Promise.all([...SHELL_FILES.map(f => './' + f), ...STATIC_ASSETS].map(async (url) => {
        try {
          const res = await fetchClean(url);
          await cache.put(url, res);
        } catch (err) { /* asset unreachable, skip; fetch handler will retry live */ }
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

function isShellRequest(request) {
  if (request.mode === 'navigate') return true;
  const path = new URL(request.url).pathname;
  return SHELL_FILES.some((f) => path === '/' + f || path.endsWith('/' + f));
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // App shell (index.html, app.js, styles.css, manifest.json): always go to
  // the network first so a redeploy is visible on the very next load, no
  // dependency on this file's own cache-version string ever being bumped.
  // Falls back to the last cached copy only when there's no connection.
  if (isShellRequest(e.request)) {
    const cacheKey = e.request.mode === 'navigate' ? './index.html' : e.request;
    e.respondWith(
      fetchClean(e.request.mode === 'navigate' ? './index.html' : e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(cacheKey, clone));
          }
          return res;
        })
        .catch(() => caches.match(cacheKey))
    );
    return;
  }

  // Everything else (icons, fonts): cache-first, since these essentially
  // never change and there's no benefit to re-fetching them every load.
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
