/**
 * caches public images so repeat visits feel faster.
 */

const CACHE_NAME = "app-images-v1";
const IMAGE_CACHE_DURATION = 24 * 60 * 60 * 1000;

// cache images and known media hosts.
const CACHEABLE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg)$/i,
  /cloudinary\.com/i,
  /amazonaws\.com/i,
  /images/i,
  /uploads/i,
  /logo/i,
  /\/api\/.*\.(jpg|jpeg|png|gif|webp|svg)$/i,
];

// keep the cache focused on visual assets.
function shouldCache(url) {
  return CACHEABLE_PATTERNS.some((pattern) => pattern.test(url));
}

// activate the current worker as soon as it is installed.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// remove older image caches before taking control.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) => name.startsWith("app-images-") && name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// fetch images from the network first and fall back to cache.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // only handle get requests for images.
  if (request.method !== "GET" || !shouldCache(request.url)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        // clone the response before caching it.
        const responseToCache = response.clone();

        // cache successful image responses.
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);

          // store a timestamp so stale entries can expire.
          const headers = new Headers(response.headers);
          headers.append("sw-cached-at", Date.now().toString());

          const modifiedResponse = new Response(responseToCache.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
          });

          await cache.put(request, modifiedResponse);
        }

        return response;
      })
      .catch(async () => {
        // use cache when the network is unavailable.
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);

        if (cached) {
          // keep cached responses within the configured lifetime.
          const cachedAt = cached.headers.get("sw-cached-at");
          if (cachedAt) {
            const age = Date.now() - parseInt(cachedAt);
            if (age < IMAGE_CACHE_DURATION) {
              return cached;
            } else {
              await cache.delete(request);
            }
          } else {
            // older entries can still serve as a last fallback.
            return cached;
          }
        }

        return new Response({
          status: 503,
          statusText: "Service Unavailable",
        });
      })
  );
});

// support manual cache actions from the app.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === "GET_CACHE_SIZE") {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const keys = await cache.keys();
        event.ports[0].postMessage({ size: keys.length });
      })
    );
  }
});
