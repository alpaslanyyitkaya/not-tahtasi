// Service worker: uygulamanın tüm dosyalarını önbelleğe alır, internetsiz çalışmayı sağlar.
// Her yayında VERSION değişir; yeni sürüm kullanıcı "Yeniden başlat" deyince devreye girer.
const VERSION = 'v4';
const CACHE = `not-tahtasi-${VERSION}`;
// Bu liste uygulamadaki tüm dosyaları içermeli (tests/assets.test.mjs denetler).
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'js/main.js',
  'js/router.js',
  'js/ui.js',
  'js/ids.js',
  'js/time.js',
  'js/db.js',
  'js/settings.js',
  'js/device-info.js',
  'js/backup.js',
  'js/backup-tools.js',
  'js/list/list-model.js',
  'js/list/list-screen.js',
  'js/board/board-screen.js',
  'js/board/input.js',
  'js/board/history.js',
  'js/board/geometry.js',
  'js/board/render.js',
  'js/board/images.js',
  'js/board/image-tools.js',
  'js/board/save-status.js',
  'js/board/persistence.js',
  'js/board/export.js',
  'js/board/share-tools.js',
];

// Yeni sürüm, kullanıcı "Yeniden başlat"a dokununca devreye girer.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('install', (event) => {
  // cache: 'reload' — tarayıcının HTTP önbelleğindeki eski dosyalar yeni sürüme karışmasın.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('not-tahtasi-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      return (await cache.match('index.html')) || fetch(req);
    }
    return (await cache.match(req, { ignoreSearch: true })) || fetch(req);
  })());
});
