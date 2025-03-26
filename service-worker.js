// Cache names
const CACHE_NAME = 'prayer-times-app-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Resources to pre-cache
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap',
  'https://fonts.googleapis.com/css2?family=Amiri&family=Scheherazade+New&display=swap',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js',
  'https://cdn-icons-png.flaticon.com/512/3771/3771417.png'
];

// Install event - pre-cache resources
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing');
  
  // Skip waiting to activate immediately on iOS
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching files');
        return cache.addAll([...PRECACHE_URLS, ...EXTERNAL_RESOURCES]);
      })
      .catch(error => {
        console.error('[Service Worker] Pre-caching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating');
  
  // Claim clients immediately for iOS
  event.waitUntil(self.clients.claim());
  
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => !currentCaches.includes(cacheName))
          .map(cacheToDelete => {
            console.log('[Service Worker] Deleting old cache:', cacheToDelete);
            return caches.delete(cacheToDelete);
          })
      );
    })
  );
});

// Fetch event - respond from cache or network
self.addEventListener('fetch', event => {
  // Skip requests that aren't GET
  if (event.request.method !== 'GET') return;
  
  // iOS Safari requires a different approach
  const requestURL = new URL(event.request.url);
  
  // Handle the fetch event
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(cache => {
      return fetch(event.request)
        .then(networkResponse => {
          // Save a copy of the response in the runtime cache.
          // This is especially important for iOS
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(error => {
          console.log('[Service Worker] Fetch failed, falling back to cache:', error);
          return cache.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // For HTML requests, try to return the index page as fallback
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('./index.html');
              }
              
              return new Response('Network error occurred', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        });
    })
  );
}); 