/* eslint-disable no-restricted-globals */
/**
 * Vaani service worker.
 *
 * Strategy:
 *  - Pre-cache the manifest, icons, and the offline shell on install.
 *  - For navigations: try the network first, fall back to the cached shell so
 *    a cold load still renders something when offline.
 *  - For static assets (JS / CSS / fonts / images / svg): stale-while-revalidate
 *    so repeat visits feel instant and cache stays fresh.
 *  - Never intercept API, auth, or websocket traffic — those need live data.
 */

const VERSION = "v1";
const RUNTIME_CACHE = `vaani-runtime-${VERSION}`;
const ASSET_CACHE = `vaani-assets-${VERSION}`;

const PRECACHE_URLS = [
  "/manifest.json",
  "/icon.svg",
  "/icon-maskable.svg",
  "/apple-touch-icon.svg",
  "/logo.svg",
];

const NEVER_CACHE_PREFIXES = [
  "/api/",
  "/_next/data/",
  "/sw.js",
  "/socket",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== RUNTIME_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldBypass(url) {
  if (url.origin !== self.location.origin) return true;
  return NEVER_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p));
}

async function networkFirstNavigation(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (_) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const shell = await cache.match("/");
    if (shell) return shell;
    return new Response(
      "<h1>You are offline</h1><p>Vaani needs a connection right now.</p>",
      { headers: { "Content-Type": "text/html" }, status: 503 }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (shouldBypass(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const dest = request.destination;
  if (
    dest === "style" ||
    dest === "script" ||
    dest === "font" ||
    dest === "image" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
