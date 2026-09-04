/* Assan Port HSE Takip - Service Worker
   Uygulama kabugu onbellege alinir; personel verisi ASLA onbellege alinmaz
   (Firebase Realtime Database istekleri buradan gecmez). */
const VERSION = 'v1';
const SHELL_CACHE = 'hse-shell-' + VERSION;
const RUNTIME_CACHE = 'hse-runtime-' + VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

// Sadece bu CDN'lerden gelen statik dosyalar onbellege alinir.
const CDN_HOSTS = ['www.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.includes(url.hostname);

  // Veritabani/kimlik dogrulama trafigi dogrudan aga gider, onbellege alinmaz.
  if (!sameOrigin && !isCdn) return;

  // Sayfa gezinmesi: once ag, calismazsa onbellekteki kabuk.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Statik dosyalar: once onbellek, arka planda tazele.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok && res.type !== 'opaque') {
          const copy = res.clone();
          caches.open(sameOrigin ? SHELL_CACHE : RUNTIME_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
