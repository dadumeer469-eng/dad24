const CACHE_NAME = "dadu-food-pwa-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.svg",
  "/logo-192.png",
  "/logo-512.png"
];

// 1. Install Event: Pre-cache core app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[PWA SW] Pre-caching core app shell");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[PWA SW] Pre-cache partial warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[PWA SW] Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Determine if request is an image or static asset
function isStaticAsset(url) {
  return (
    url.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|css|js)(\?.*)?$/i) ||
    url.includes("images.unsplash.com") ||
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com")
  );
}

// 3. Fetch Event: Smart Cache-First for assets, Stale-While-Revalidate for pages
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET, chrome-extension, or WebSocket requests
  if (req.method !== "GET" || url.protocol.startsWith("chrome-extension") || url.protocol === "ws:" || url.protocol === "wss:") {
    return;
  }

  // Skip Firebase/Firestore API calls so live DB sync works naturally
  if (url.hostname.includes("firestore.googleapis.com") || url.hostname.includes("firebase")) {
    return;
  }

  // Strategy A: Cache-First with Network Fallback & Auto-Save for Images & Assets
  if (isStaticAsset(req.url)) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from local device cache instantly! Update cache in background
          fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
          }).catch(() => {/* Offline background fetch error ignored */});
          return cachedResponse;
        }

        // If not in cache, fetch from network and save to local mobile cache immediately!
        return fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback for images
          if (req.headers.get("accept")?.includes("image")) {
            return caches.match("/logo.svg");
          }
        });
      })
    );
    return;
  }

  // Strategy B: Network-First with Cache Fallback for Navigation/Pages
  event.respondWith(
    fetch(req).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const resClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
      }
      return networkResponse;
    }).catch(async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const rootCached = await caches.match("/");
      if (rootCached) return rootCached;
      return caches.match("/index.html");
    })
  );
});
