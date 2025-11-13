// Photo Delivery Scheduler - Service Worker
// Asset-only caching strategy: Cache JS/CSS/fonts/images aggressively, never cache HTML/API

const CACHE_NAME = 'photo-delivery-scheduler-v2';
const OFFLINE_URL = '/offline';

// Critical static assets to pre-cache on install
const STATIC_ASSETS = [
  '/offline',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.webmanifest',
];

// Asset type matchers
const VERSIONED_ASSETS = /\/_next\/static\//; // Next.js bundled assets (JS, CSS)
const FONTS = /\.(woff2?|ttf|otf|eot)$/i;
const IMAGES = /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i;
const API_ROUTES = /\/api\//;

// Install event - cache critical static assets
self.addEventListener('install', (event) => {
  console.log('[SW v2] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW v2] Pre-caching critical assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('[SW v2] Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW v2] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW v2] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

// Fetch event - smart caching based on asset type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests (chrome-extension, etc.)
  if (!request.url.startsWith('http')) {
    return;
  }

  // Strategy 1: Cache-first for versioned Next.js assets (/_next/static/*)
  // These are immutable and versioned, safe to cache forever
  if (VERSIONED_ASSETS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Strategy 2: Cache-first for fonts
  // Fonts rarely change and are large, good candidates for aggressive caching
  if (FONTS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Strategy 3: Cache-first for images (with stale-while-revalidate)
  // Images change occasionally, so update in background
  if (IMAGES.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // Strategy 4: NEVER cache API routes - always fetch fresh
  // Prevents stale data issues
  if (API_ROUTES.test(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  // Strategy 5: NEVER cache HTML pages - always fetch fresh
  // Prevents conflicts with Server Components and optimistic UI
  // This is the KEY change from the reverted approach
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Only on network failure, show offline page
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Default: network-first for everything else
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// Cache-first strategy: Try cache, fallback to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW v2] Cache hit:', request.url);
    return cached;
  }

  console.log('[SW v2] Cache miss, fetching:', request.url);
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW v2] Fetch failed:', error);
    throw error;
  }
}

// Network-first strategy: Try network, fallback to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW v2] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale-while-revalidate: Return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.status === 200) {
      const cache = caches.open(cacheName);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });

  return cached || fetchPromise;
}

// Listen for skip waiting message from PWA registration
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW v2] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});
