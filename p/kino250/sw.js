// Kino 250 – service worker: działa offline (najpierw pamięć, w tle odświeża z sieci).
const CACHE = 'kino250-v4';
const PLIKI = [
  './',
  './index.html',
  './app.js',
  './filmy.json',
  './manifest.webmanifest',
  './ikony/ikona-192.png',
  './ikony/ikona-512.png',
  './ikony/ikona-maskable-192.png',
  './ikony/ikona-maskable-512.png',
  './ikony/apple-touch-icon.png',
  './ikony/klaps.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PLIKI.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((klucze) => Promise.all(klucze.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // np. link do IMDb – bez pośrednictwa

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const klucz = req.mode === 'navigate' ? './index.html' : req;
    const zPamieci = await cache.match(klucz, { ignoreSearch: true });
    const zSieci = fetch(req.url, { cache: 'no-cache' }).then((odp) => {
      if (odp && odp.ok) cache.put(klucz, odp.clone());
      return odp;
    }).catch(() => null);
    if (zPamieci) { e.waitUntil(zSieci); return zPamieci; }
    const odp = await zSieci;
    return odp || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
