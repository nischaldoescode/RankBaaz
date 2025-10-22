// public/sw.js
/**
 * Service Worker for image caching
 * Handles course images, logos, and other static assets
 */

const CACHE_NAME = 'app-images-v1';
const IMAGE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Patterns to cache
const CACHEABLE_PATTERNS = [
  /\/api\/.*\.(jpg|jpeg|png|gif|webp|svg)$/i,
  /cloudinary\.com/i,
  /images/i,
  /logo/i
];

// Check if URL should be cached
function shouldCache(url) {
  return CACHEABLE_PATTERNS.some(pattern => pattern.test(url));
}

// Install event
self.addEventListener('install', (event) => {
//   console.log('[SW] Service Worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
//   console.log('[SW] Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('app-images-') && name !== CACHE_NAME)
          .map((name) => {
            // console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests for images
  if (request.method !== 'GET' || !shouldCache(request.url)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        // Clone response before caching
        const responseToCache = response.clone();

        // Check if it's a valid response
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          
          // Add timestamp header for expiration tracking
          const headers = new Headers(response.headers);
          headers.append('sw-cached-at', Date.now().toString());
          
          const modifiedResponse = new Response(responseToCache.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
          });

          await cache.put(request, modifiedResponse);
        //   console.log('[SW] Cached image:', url.pathname);
        }

        return response;
      })
      .catch(async () => {
        // Network failed, try cache
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);

        if (cached) {
          // Check cache age
          const cachedAt = cached.headers.get('sw-cached-at');
          if (cachedAt) {
            const age = Date.now() - parseInt(cachedAt);
            if (age < IMAGE_CACHE_DURATION) {
            //   console.log('[SW] Serving cached image:', url.pathname, `(age: ${Math.round(age / 1000 / 60)}m)`);
              return cached;
            } else {
            //   console.log('[SW] Cached image expired:', url.pathname);
              await cache.delete(request);
            }
          } else {
            // Old cache without timestamp, use it anyway
            // console.log('[SW] Serving cached image (no timestamp):', url.pathname);
            return cached;
          }
        }

        // Return offline placeholder or error
        // console.log('[SW] No cache available for:', url.pathname);
        return new Response( {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Message event for manual cache operations
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        // console.log('[SW] Cache cleared');
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const keys = await cache.keys();
        event.ports[0].postMessage({ size: keys.length });
      })
    );
  }
});