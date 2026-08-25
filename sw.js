const CACHE_NAME = 'artbytisha-v11'; // Change this number on major updates
const STATIC_ASSETS = [
    './',
    './manifest.json',
    './logo.png',
    './launchericon-192x192.png',
    './launchericon-512x512.png'
];

// Install: Cache essential app shell
self.addEventListener('install', event => {
    self.skipWaiting(); // Force new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
});

// Activate: Delete OLD caches automatically
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('🧹 Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Strategy: NETWORK FIRST for HTML (Auto-Updates), Cache First for Images
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Bypass caching for API and Google Sheets
    if (url.hostname.includes('google.com') || 
        url.hostname.includes('googleusercontent.com') || 
        url.hostname.includes('counterapi.dev')) {
        return;
    }

    // NETWORK FIRST Strategy for HTML / Navigation
    if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // Save latest version to cache in background
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                    return networkResponse;
                })
                .catch(() => {
                    // Offline fallback
                    return caches.match(request);
                })
        );
        return;
    }

    // CACHE FIRST Strategy for static images / icons
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                }
                return networkResponse;
            });
        })
    );
});
