/// <reference lib="webworker" />

// This file is a custom service worker.
// It's used by the 'next-pwa' package to generate the final service worker.

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

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

// This is a common caching strategy for pages.
// It tries to get the page from the network first to ensure it's up-to-date.
// If the network is unavailable, it falls back to the cached version.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  })
);

// Cache Google Fonts stylesheets with a stale-while-revalidate strategy.
registerRoute(
  ({url}) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache Google Fonts webfont files with a cache-first strategy for 1 year.
registerRoute(
  ({url}) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 Year
        maxEntries: 30,
      }),
    ],
  })
);

// This allows the web app to trigger skipWaiting via
// sw.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
