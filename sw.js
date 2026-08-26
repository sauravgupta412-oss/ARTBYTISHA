/* Art By Tisha service worker */
const CACHE_NAME = "abt-store-v13";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo.png",
  "./launchericon-192x192.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // 1. DO NOT cache Google Sheets API in Service Worker (index.html handles this via localStorage)
  if (req.url.includes("docs.google.com/spreadsheets")) {
    return;
  }

  // 2. Bypass SW for audio files (Fixes Safari/Chrome MP3 streaming & range request bugs)
  if (req.url.endsWith(".mp3") || req.headers.get('range')) {
    return;
  }

  // 3. Cache product images and website assets normally (Stale-While-Revalidate)
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        // Cache valid responses and opaque responses (Google Drive images)
        if (res && (res.status === 200 || res.status === 0)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached); // If offline, fallback to cache

      return cached || network;
    })
  );
});

/* Notification click → open store */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

/* Optional: OneSignal may send push events later */
self.addEventListener("push", (event) => {
  let data = { title: "Art By Tisha", body: "New offer is live!" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Art By Tisha", {
      body: data.body || "New update available",
      icon: "launchericon-192x192.png",
      badge: "launchericon-192x192.png",
      data: { url: data.url || "./" }
    })
  );
});
