// StreamProof service worker.
// - Pages: network first, then the last copy, then /offline.html.
// - Build assets, fonts, icons: cache first (their names change when they change).
// - API reads: network first, falling back to the last answer so "My reports" opens offline.
// - API writes are never cached; the app's outbox handles offline reports.
const VERSION = "sp-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

async function networkFirst(req, fallback) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (fallback ? cache.match(fallback) : Response.error());
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.mode === "navigate") return e.respondWith(networkFirst(req, "/offline.html"));
  if (url.pathname.startsWith("/api/media/") || url.pathname.endsWith(".pdf")) return; // private files: never cached
  if (url.pathname.startsWith("/api/")) return e.respondWith(networkFirst(req));
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    return e.respondWith(cacheFirst(req));
  }
});
