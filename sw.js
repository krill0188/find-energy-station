const CACHE = 'energy-v3';
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
  // 네비게이션 요청 (페이지 이동)은 절대 가로채지 않음
  if (e.request.mode === 'navigate') return;
  // 같은 도메인 자원만 캐시
  const url = e.request.url;
  if (!url.startsWith(self.location.origin)) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
