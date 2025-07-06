'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/workbox';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // This function sets up the service worker and its listeners.
    registerServiceWorker();

    // --- Register sync tasks for PWABuilder detection ---
    const registerSyncs = async () => {
        if (!('serviceWorker' in navigator)) return;
        
        const registration = await navigator.serviceWorker.ready;
        
        // Background Sync Registration
        if ('sync' in registration) {
            try {
                await registration.sync.register('my-background-sync');
                console.log('Background sync registered');
            } catch (err) {
                // This might fail if permissions are not granted, which is okay.
                // We are just signaling the intent to use it.
                console.warn('Background sync registration failed:', err);
            }
        }

        // Periodic Sync Registration
        if ('periodicSync' in (registration as any)) {
             try {
                 // @ts-ignore
                const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                if (status.state === 'granted') {
                    // @ts-ignore
                    await registration.periodicSync.register('my-periodic-sync', {
                        minInterval: 24 * 60 * 60 * 1000, // 24 hours
                    });
                    console.log('Periodic sync registered');
                }
            } catch (err) {
                 console.warn('Periodic sync registration failed:', err);
            }
        }
    }
    
    registerSyncs();
  }, []);

  return null; // This component doesn't render anything visible
}
