'use client';

import { useEffect } from 'react';

/**
 * PWA Service Worker Registration Component
 * Registers the service worker for offline support and asset caching
 * Updated for v2: Asset-only caching strategy
 */
export function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Always fetch fresh service worker
        })
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);

          // Check for updates on page load
          registration.update();

          // Check for updates periodically (every 5 minutes)
          setInterval(
            () => {
              registration.update();
            },
            5 * 60 * 1000
          );

          // Listen for new service worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  console.log('[PWA] New service worker available');
                  // Force activation of new service worker
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  // Reload page to use new service worker
                  window.location.reload();
                }
              });
            }
          });

          // Listen for controller change (new service worker activated)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[PWA] Service Worker updated, reloading...');
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Log cache hits/misses for debugging (development helper)
      if (window.location.hostname === 'localhost') {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'CACHE_HIT') {
            console.log('[PWA] Cache hit:', event.data.url);
          } else if (event.data?.type === 'CACHE_MISS') {
            console.log('[PWA] Cache miss:', event.data.url);
          }
        });
      }
    }
  }, []);

  return null;
}
