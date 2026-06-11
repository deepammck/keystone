// Keystone service worker — app-shell caching + offline fallback.
// Hand-written (no build step) so it stays bundler-agnostic on Next 16.

const CACHE = "keystone-v2";
const OFFLINE_URL = "/~offline";
const PRECACHE = ["/~offline", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GETs. Mutations (Supabase writes) are replayed by the app's
  // own offline queue, not the SW.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Don't cache cross-origin requests (e.g. the Supabase REST/Realtime API).
  if (url.origin !== self.location.origin) return;

  // Never cache API routes (e.g. /api/fetch-metadata) — they're dynamic,
  // per-request, and must always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: network-first, fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)),
      ),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
