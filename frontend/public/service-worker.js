/**
 * Service Worker – offline caching + background sync.
 *
 * Strategy:
 *   - Cache-first for static assets and app shell (Next.js _next/static)
 *   - Network-first for API calls, falling back to cached responses
 *   - Background sync for queued mutations (POST/PUT/DELETE)
 */

const CACHE_NAME = "tc-v1";
const STATIC_ASSETS = ["/", "/dashboard", "/manifest.json"];

// ── Install ─────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ───────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for cache (mutations use background sync)
  if (request.method !== "GET") return;

  // Static assets → cache-first
  if (url.pathname.startsWith("/_next/static") || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // API calls → network-first with cache fallback
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth") || url.pathname.startsWith("/trips") || url.pathname.startsWith("/sync")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Default → network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Background Sync ─────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-changes") {
    event.waitUntil(syncPendingChanges());
  }
});

async function syncPendingChanges() {
  // This delegates to the IndexedDB-based sync logic in the main app.
  // The main thread posts a message when connectivity resumes.
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: "SYNC_NOW" });
  }
}

// ── Message handler ─────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
