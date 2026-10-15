// Kino 250 – service worker.
// Strona, skrypt i lista: najpierw sieć (świeża wersja), a gdy jej brak albo trwa za długo – kopia z pamięci.
// Okładki i ikony: najpierw pamięć (nie zmieniają się), a brakujące dociąga z sieci.
const CACHE = 'kino250-v6';
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
const LIMIT_MS = 4000;

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

const zLimitem = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok(null), ms))]);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // np. link do IMDb – bez pośrednictwa

  const obraz = /\/(okladki|ikony)\//.test(url.pathname);
  const klucz = req.mode === 'navigate' ? './index.html' : url.pathname;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const zSieci = fetch(req.url, { cache: 'no-cache' }).then((odp) => {
      if (odp && odp.ok) cache.put(klucz, odp.clone()).catch(() => {});
      return odp && odp.ok ? odp : null;
    }).catch(() => null);

    if (obraz) {
      const zPamieci = await cache.match(klucz);
      if (zPamieci) return zPamieci;
      return (await zSieci) || new Response('', { status: 404 });
    }

    const swieze = await zLimitem(zSieci, LIMIT_MS);
    if (swieze) return swieze;
    const zPamieci = await cache.match(klucz);
    if (zPamieci) return zPamieci;
    return (await zSieci) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
