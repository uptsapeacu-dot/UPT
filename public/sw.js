const CACHE_NAME = "upt-pwa-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/logo_prefeitura_azul.png",
  "/logo_secretaria_azul.png",
];

// Install Event - Pre-cache essential resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching static assets");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic routing and caching strategy
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and skip Supabase/API requests
  if (event.request.method !== "GET" || event.request.url.includes("/api/") || event.request.url.includes("supabase.co")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached resource, but fetch in the background to update cache (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silently fail if offline during background revalidation
          });
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful responses for future offline use (excluding non-basic responses)
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If offline and request fails, try to return index.html for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
