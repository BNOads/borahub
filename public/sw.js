const CACHE_NAME = 'boranahobra-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
  '/apple-touch-icon.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    }).catch((err) => {
      console.log('Cache error during install:', err);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension URLs entirely
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip API calls and Supabase - let them go directly to network without SW intervention
  if (request.url.includes('/api/') ||
      request.url.includes('supabase') ||
      request.url.includes('/auth/') ||
      request.url.includes('/rest/') ||
      request.url.includes('/storage/')) {
    return;
  }

  // Only cache static assets from same origin
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network first strategy for HTML and other resources
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          }).catch(() => {});
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache if network fails
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          // Return a simple offline response for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 408, statusText: 'Offline' });
        });
      })
  );
});

// Handle background sync (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Implement your background sync logic here
      Promise.resolve()
    );
  }
});
