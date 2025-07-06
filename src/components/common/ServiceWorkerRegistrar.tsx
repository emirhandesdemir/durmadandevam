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

    // Clean up the event listener when the component unmounts.
    return () => {
      window.removeEventListener('sw-update', handleUpdate);
    };
  }, [toast]);

  return null; // This component doesn't render anything visible
}
