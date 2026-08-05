const CACHE_NAME = "dadu-food-app-shell-v3";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo-192.png",
  "/logo-512.png",
  "/site-logo.jpg",
  "/logo.png"
];

// Install: Pre-cache App Shell resources immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching App Shell for instant loading");
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Partial precache warning:", err);
      });
    })
  );
});

// Activate: Claim clients and remove outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[SW] Removing legacy cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Instant Cache-First with Network Revalidation
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Exclude non-GET requests and external real-time data APIs (Firebase/Firestore handle their own IndexedDB cache)
  if (req.method !== "GET" || url.origin.includes("firestore") || url.origin.includes("identitytoolkit")) {
    return;
  }

  // Handle SPA Navigation requests (Opening the app or refreshing)
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cachedIndex) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          }
          return networkResponse;
        }).catch(() => {
          return cachedIndex;
        });

        // Serve cached index immediately if available so app opens in <100ms
        return cachedIndex || fetchPromise;
      })
    );
    return;
  }

  // Handle static assets (JS, CSS, Icons, Fonts)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      }).catch((err) => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
