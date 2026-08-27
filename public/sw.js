// Cinch Seed service worker — offline shell + static asset caching.
const CACHE = "cinch-cache-v3";
const APP_SHELL = [
  "/offline.html",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];
const ASSET_RE = /\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|woff2?)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: let the browser handle the request completely natively
  // whenever we might be online — this is what correctly applies Set-Cookie
  // headers and follows redirects (e.g. right after signing in) exactly as
  // it would with no service worker at all. Re-fetching a navigation
  // Request from inside the worker (even with credentials forced on) adds
  // an extra hop that can occasionally race the browser's own cookie-jar
  // update for that same response, so we only step in for the offline
  // fallback path, not the happy path.
  if (request.mode === "navigate") {
    if (!self.navigator.onLine) {
      event.respondWith(
        caches
          .match(request)
          .then((cached) => cached || caches.match("/offline.html")),
      );
    }
    return;
  }

  // Static assets: stale-while-revalidate.
  if (url.pathname.startsWith("/_next/") || ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
