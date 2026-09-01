/* SINOVA'26 service worker — makes the app installable + basic offline shell.
   Kept deliberately simple (no Workbox) and only touches same-origin GETs so
   Firebase Firestore/Auth traffic is never intercepted. */
const CACHE = "sinova-cache-v4";
const APP_SHELL = "/index.html";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop old cache versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave Firebase & other hosts alone

  // Navigations: network-first (always try for the freshest app), fall back to cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(APP_SHELL, copy));
          return res;
        })
        .catch(() => caches.match(APP_SHELL))
    );
    return;
  }

  // Static assets (hashed JS/CSS/img): cache-first, populate on first fetch.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached)
    )
  );
});
