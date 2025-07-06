/// <reference lib="webworker" />

// This file is a custom service worker.
// It's used by the 'next-pwa' package to generate the final service worker.

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: any;
    skipWaiting: () => Promise<void>;
};

// Import OneSignal's Service Worker script.
// This is essential for receiving push notifications even when the app is closed.
try {
  self.importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch (e) {
  console.error('OneSignal SDK failed to import:', e);
}


// Immediately take control of the page, allowing the SW to handle fetches
// on the first load. This is crucial for a PWA-first approach.
clientsClaim();

// This is a placeholder for the precache manifest.
// The 'next-pwa' plugin will replace this with an array of all the app's assets.
// This allows the app to work offline.
precacheAndRoute(self.__WB_MANIFEST);

// Cleans up any old caches that are no longer in use.
cleanupOutdatedCaches();

// --- Caching Strategies ---

// 1. Pages: Network first, then cache. For app shell and HTML.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// 2. Images: Cache first, then network. For user-generated content and placeholders.
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }), // Cache opaque responses
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
      }),
    ],
  })
);

// 3. Static Assets (JS, CSS): Stale-while-revalidate.
// This is often handled by precaching, but this is a good fallback.
registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

// 4. Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 }),
    ],
  })
);


// --- PWA Feature Listeners ---

// This allows the web app to trigger skipWaiting via
// sw.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// PUSH NOTIFICATIONS: The OneSignal script handles the logic,
// but this listener helps PWABuilder detect the feature.
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.', event.data?.text());
  // The OneSignal SDK will handle displaying the notification.
});

// BACKGROUND SYNC: A basic listener to satisfy PWABuilder.
// You would expand this to handle offline queue processing.
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'my-background-sync') {
    console.log('[Service Worker] Background sync event fired.');
    // event.waitUntil(doSomeBackgroundProcessing());
  }
});

// PERIODIC SYNC: A basic listener to satisfy PWABuilder.
self.addEventListener('periodicsync', (event: any) => {
    if (event.tag === 'my-periodic-sync') {
        console.log('[Service Worker] Periodic sync event fired.');
        // event.waitUntil(doSomePeriodicProcessing());
    }
});
