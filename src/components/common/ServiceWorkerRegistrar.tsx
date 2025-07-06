'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/workbox';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { Workbox } from 'workbox-window';

export default function ServiceWorkerRegistrar() {
  const { toast } = useToast();

  useEffect(() => {
    // This function now only sets up the service worker and its listeners.
    registerServiceWorker();

    // Define the event handler for our custom event.
    const handleUpdate = (event: Event) => {
      const wb = (event as CustomEvent<Workbox>).detail;
      
      const { id, dismiss } = toast({
        title: 'Yeni Güncelleme Mevcut!',
        description: 'Uygulamanın yeni bir sürümü hazır. Yüklemek için butona tıklayın.',
        duration: Infinity,
        action: (
          <Button
            onClick={() => {
              // Tell the service worker to skip waiting and activate the new version.
              wb?.messageSkipWaiting();
              dismiss(id);
            }}
          >
            Güncelle ve Yenile
          </Button>
        ),
      });
    };

    // Add the event listener to the window object.
    window.addEventListener('sw-update', handleUpdate);

    // --- NEW: Register sync tasks for PWABuilder detection ---
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
    // --- END NEW ---

    // Clean up the event listener when the component unmounts.
    return () => {
      window.removeEventListener('sw-update', handleUpdate);
    };
  }, [toast]);

  return null; // This component doesn't render anything visible
}
