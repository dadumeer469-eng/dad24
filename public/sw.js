const CACHE_NAME = "dadu-food-static-v6";
const RUNTIME_CACHE = "dadu-food-runtime-v6";
const IMAGE_CACHE = "dadu-food-images-v6";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.png"
];

// Fallback SVG image response for missing icon assets
const SVG_FALLBACK = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="100" fill="#d70f64"/><text x="50%" y="55%" fill="#ffffff" font-size="110" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">DADU</text></svg>`;

function getSvgFallbackResponse() {
  return new Response(SVG_FALLBACK, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" }
  });
}

// Install Event: Precache static core assets
self.addEventListener("install", (event) => {
  console.log("⚡ [Service Worker v6] Installing and caching core static assets...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("PWA SW precache notice:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean old cache versions immediately
self.addEventListener("activate", (event) => {
  console.log("🚀 [Service Worker v6] Activated successfully!");
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

  // 2. Images & Icons: Cache-First Strategy with SVG Fallback on 404/failure
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
                return networkResponse;
              }
              // If missing or 404, return inline SVG fallback
              return getSvgFallbackResponse();
            })
            .catch(() => {
              return getSvgFallbackResponse();
            });
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
