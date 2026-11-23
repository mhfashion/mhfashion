/*
 * MH Fashion service worker (Plan P2 item 15: a PWA before any native app).
 *
 * The rule this file exists to keep: a shop page may be served from cache when the phone is offline,
 * but the editor and the admin never are. A stale editor bundle means a customer designs against
 * yesterday's code, and a stale admin page means the shop reads numbers that have moved. So:
 *   - only GET is cached at all,
 *   - /admin, /create, /api, /auth, /checkout and /account go straight to the network,
 *   - a page that is not cached shows the offline page instead of a browser error,
 *   - a new worker version throws the old caches away.
 */
const VERSION = "mh-fashion-v3";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

const SHELL_ASSETS = [
  "/offline",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

/** Paths that always come from the network, whatever the cache holds. */
const NETWORK_ONLY = ["/admin", "/create", "/api", "/auth", "/checkout", "/account"];

/**
 * The offline page itself, or — if its cache entry is gone — a self-contained copy. A service worker
 * that answers a navigation with `undefined` hands the customer the browser's error screen instead.
 */
function offlineResponse() {
  return caches.match(OFFLINE_URL).then((cached) => cached || new Response(OFFLINE_FALLBACK_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  }));
}

const OFFLINE_FALLBACK_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — MH Fashion</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0c0c;color:#f5f5f5;font:14px/1.6 system-ui,sans-serif;padding:24px}
main{max-width:420px;text-align:center}h1{font-size:20px;margin:0 0 8px}p{margin:0 0 16px;color:#a3a3a3}
a{display:inline-block;border-radius:999px;padding:10px 18px;background:#d4ff3f;color:#0c0c0c;font-weight:700;text-decoration:none}</style>
</head><body><main><h1>You are offline</h1><p>The shop needs a connection. Pages you already opened still open from this phone.</p>
<a href="/">Try the shop again</a></main></body></html>`;

function isNetworkOnly(pathname) {
  return NETWORK_ONLY.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // A range request (video, some fonts) does not survive the Cache API cleanly.
  if (request.headers.has("range")) return;

  if (isNetworkOnly(url.pathname)) {
    // Never from the cache, but still our page when the network is gone: the browser's own error
    // screen would leave the customer with nothing to press.
    if (request.mode === "navigate") {
      event.respondWith(fetch(request).catch(() => offlineResponse()));
    }
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || offlineResponse())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
