/* 착한주유소 Service Worker v4
 * 전략:
 *  - 정적 자원: Cache First (즉시 반환, 백그라운드 갱신 없음)
 *  - HTML 네비게이션: Network First (오프라인 시 캐시 → offline.html)
 *  - Opinet/지도 API: Stale While Revalidate (캐시 즉시 반환 + 백그라운드 갱신)
 *  - 외부 도메인(naver/kakao 등): 네트워크 통과 (캐시 X)
 */

const VERSION = 'v4';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const OFFLINE_URL = './offline.html';

const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './favicon.ico',
  './icon-32.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

// ── 설치: 정적 자원 사전 캐싱 ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Precache failed:', err))
  );
});

// ── 활성화: 구버전 캐시 정리 ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── 페치 핸들러 ────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // POST 등 GET이 아닌 요청은 통과
  if (request.method !== 'GET') return;

  // 1. 네비게이션 요청 (HTML 페이지)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // 2. 같은 도메인 정적 자원
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 3. Opinet API (KATEC 좌표 기반 주유소 데이터)
  if (url.hostname.includes('opinet.co.kr')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 4. CORS 프록시 (corsproxy.io 등)
  if (url.hostname.includes('corsproxy') || url.hostname.includes('allorigins')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 5. 그 외 외부 자원 (지도 타일, 카카오/네이버 API 등) → 네트워크 직통
  // (캐시 안 함: 인증 헤더, 동적 데이터, 용량 부담)
});

// ── 캐시 전략 함수들 ───────────────────────────────────────────────────────

// Cache First: 정적 자원
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

// Network First with Offline Fallback: HTML 네비게이션
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate: API 응답
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ── 메시지 핸들러: 클라이언트가 SW 갱신 요청 ────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
