const CACHE = 'energy-v1';
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
  // API 요청은 네트워크 우선
  if (e.request.url.includes('opinet.co.kr') || e.request.url.includes('dapi.kakao.com') || e.request.url.includes('openapi.naver.com') || e.request.url.includes('nominatim') || e.request.url.includes('corsproxy') || e.request.url.includes('allorigins') || e.request.url.includes('codetabs')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // 정적 자원은 캐시 우선
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
