const CACHE_NAME = "dadu-food-cache-v2";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png",
  "/logo.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// On install, pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Pre-caching failed during SW install:", err);
      });
    })
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetches
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // Only handle HTTP/HTTPS and GET requests
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Avoid caching Firebase, Hot Module Replacement (HMR) or dev server API requests
  if (request.url.includes("/api/") || request.url.includes("firestore") || request.url.includes("firebase")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version, but fetch fresh one in the background (stale-while-revalidate)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch(() => { /* ignore background fetch failure */ });
        return cachedResponse;
      }

      // If not cached, fetch from network and dynamically cache it
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback to offline index.html if the request is for document navigation
          if (request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
