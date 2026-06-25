const CACHE_NAME = "dadu-food-cache-v3";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png",
  "/logo.jpg"
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

  // Avoid caching dev server websocket, hot-reloads, firebase, api, or firestore
  if (
    request.url.includes("/api/") || 
    request.url.includes("firestore") || 
    request.url.includes("firebase") ||
    request.url.includes("/@vite") ||
    request.url.includes("/node_modules/") ||
    request.url.includes("hmr") ||
    request.url.includes("sockjs")
  ) {
    return;
  }

  // NETWORK FIRST STRATEGY: Fetch from network, fall back to cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // If successful, and it's a standard static asset, put it in cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const urlStr = request.url;
          // Only dynamically cache images, fonts, and manifest to prevent JS chunk caching issues
          const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|ico|woff2|woff|ttf|otf|json)$/i.test(urlStr) || urlStr === self.location.origin + "/";
          if (isStaticAsset) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback: search cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a navigation request fails (offline), return precached root
          if (request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
  );
});
