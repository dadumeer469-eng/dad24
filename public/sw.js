const CACHE_NAME = "dadu-food-static-v6";
const RUNTIME_CACHE = "dadu-food-runtime-v6";
const IMAGE_CACHE = "dadu-food-images-v6";

// Guaranteed core precache paths only
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png"
];

// Install Event: Fault-tolerant precaching (individual fetches so single 404 never blocks installation)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn(`PWA SW Precache skipped for ${url}:`, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean old cache versions and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== RUNTIME_CACHE &&
            cacheName !== IMAGE_CACHE
          ) {
            console.log("Cleaning outdated Service Worker cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent Stale-While-Revalidate & Cache-First Strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, extension queries, and live firestore/auth endpoints
  if (
    request.method !== "GET" ||
    url.protocol.startsWith("chrome-extension") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com") ||
    url.hostname.includes("firebase")
  ) {
    return;
  }

  // 1. Navigation / Document Requests: Cache-First with background revalidation
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      caches.match("/index.html").then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. Images (Photos, Unsplash, Storage, Logos): Cache-First Strategy
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)$/i)
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Background update image cache if online
            fetch(request).then((netRes) => {
              if (netRes && netRes.status === 200) {
                cache.put(request, netRes);
              }
            }).catch(() => {});
            return cachedResponse;
          }

          return fetch(request)
            .then((networkResponse) => {
              if (
                networkResponse &&
                (networkResponse.status === 200 || networkResponse.type === "opaque")
              ) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);
        });
      })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    })
  );
});

