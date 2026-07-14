// ============================================
// SW.JS - Service Worker for KittyPlaysYourMedia
// ============================================

const CACHE_NAME = 'kitty-player-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/db.js',
  '/js/player.js',
  '/js/ui.js'
];

// ----- INSTALL: Cache all assets -----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🐱 Caching Kitty assets...');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        // Force activation
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Cache failed:', error);
      })
  );
});

// ----- ACTIVATE: Clean up old caches -----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients
      return self.clients.claim();
    })
  );
});

// ----- FETCH: Serve from cache, fallback to network -----
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone and cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((err) => console.warn('Cache put failed:', err));

            return response;
          })
          .catch((error) => {
            console.warn('Fetch failed:', error);
            // Could return a fallback page here if needed
            return new Response('🐱 Offline - Kitty is sleeping!', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ----- MESSAGE: Handle skip-waiting -----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🐱 KittyPlaysYourMedia Service Worker loaded!');