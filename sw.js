const CACHE = 'energy-v2';
const ASSETS = ['./index.html', './manifest.json', './icon-32.png', './icon-180.png', './icon-192.png', './icon-512.png', './favicon.ico'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // 외부 도메인은 서비스 워커가 무시 (쿠팡, 알리, API 등)
  if (!url.includes(self.location.origin)) return;
  // 같은 도메인 정적 자원만 캐시
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
