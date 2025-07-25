/**
 * Service Worker for Gudcity Loyalty Platform
 * Provides caching and offline support
 */

const CACHE_NAME = 'gudcity-cache-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/logo.svg',
  '/manifest.json',
];

// Cache strategies based on URL patterns
const CACHE_STRATEGIES = [
  // Cache first, then network for static assets
  {
    pattern: /\.(js|css|svg|png|jpg|jpeg|gif|woff2)$/,
    strategy: 'cache-first'
  },
  // Network first, fallback to cache for API calls
  {
    pattern: /\/api\//,
    strategy: 'network-first'
  },
  // Stale-while-revalidate for most pages
  {
    pattern: /\/$/,
    strategy: 'stale-while-revalidate'
  }
];

// Install event - precache key resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
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
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - apply caching strategies
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API POST requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Find matching strategy for this request
  const url = new URL(event.request.url);
  let matchingStrategy = 'network-first'; // Default strategy

  for (const { pattern, strategy } of CACHE_STRATEGIES) {
    if (pattern.test(url.pathname)) {
      matchingStrategy = strategy;
      break;
    }
  }

  switch (matchingStrategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request));
      break;
    case 'network-first':
      event.respondWith(networkFirst(event.request));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(event.request));
      break;
    default:
      event.respondWith(networkFirst(event.request));
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // If both cache and network fail, return a fallback
    return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If both network and cache fail, return a fallback
    return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Get from network regardless of cache status
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      // Cache the updated response
      if (networkResponse.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then(cache => cache.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(error => {
      console.error('Fetch failed in stale-while-revalidate:', error);
      // No fallback here, as we already have a cached response or will return a failure
    });

  // Return the cached response immediately if available, otherwise wait for the network
  return cachedResponse || fetchPromise;
}
