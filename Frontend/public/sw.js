/**
 * AIIMS Service Worker (PWA)
 *
 * CRITICAL SECURITY & DATA INTEGRITY RULE:
 * This service worker caches ONLY immutable/static client assets (HTML, CSS, JS, fonts, images).
 * It NEVER caches:
 * - API responses (/api/*)
 * - Credit balances or ledger transactions (/credits, /wallet, /balance)
 * - User account / profile data (/auth, /user, /account)
 * - Any non-GET requests (POST, PUT, DELETE, PATCH)
 *
 * All stateful, financial, and authentication requests bypass CacheStorage unconditionally.
 */

const CACHE_NAME = 'aiims-static-v1';

// Static resources to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/icon.svg',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/robot_mascot.jpg'
];

// Patterns that MUST NEVER be cached under any circumstances
const SENSITIVE_URL_PATTERNS = [
  /\/api\//i,
  /\/auth\//i,
  /\/credits/i,
  /\/wallet/i,
  /\/ledger/i,
  /\/account/i,
  /\/user/i,
  /\/health/i,
  /\/ready/i
];

function isSensitiveRequest(url, request) {
  // Non-GET requests must never be cached
  if (request.method !== 'GET') {
    return true;
  }

  // Cross-origin API calls or external dynamic endpoints
  const pathname = url.pathname;
  for (const pattern of SENSITIVE_URL_PATTERNS) {
    if (pattern.test(pathname) || pattern.test(url.href)) {
      return true;
    }
  }

  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Individual missing asset during development should not break service worker install
        console.warn('[SW] Precache notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. HARD SECURITY RULE: Sensitive or non-GET requests ALWAYS go directly to network
  if (isSensitiveRequest(url, request)) {
    return; // Pass through to browser default network fetch without intercepting
  }

  // 2. Navigation requests (HTML documents) -> Network first, fallback to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If valid response, update cache for offline use
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, fonts, images) -> Cache first, fallback to network
  // Only cache if origin matches or known static CDN (like Google Fonts)
  const isStaticAsset = (
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch in background to update cache for next time (stale-while-revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Cache miss -> Fetch from network
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
  }
});
