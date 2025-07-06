'use client';
import { Workbox } from 'workbox-window';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

let wb: Workbox | undefined;

export const registerServiceWorker = () => {
    if (process.env.NODE_ENV === 'development') {
        return;
    }
  
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
        wb = new Workbox('/sw.js');
        const { toast } = useToast();

        wb.addEventListener('waiting', () => {
          const { id, dismiss } = toast({
            title: 'Yeni Güncelleme Mevcut!',
            description: 'Uygulamanın yeni bir sürümü hazır. Yüklemek için butona tıklayın.',
            duration: Infinity,
            action: (
              <Button
                onClick={() => {
                  wb?.messageSkipWaiting();
                  dismiss();
                }}
              >
                Güncelle ve Yenile
              </Button>
            ),
          });
        });

        wb.addEventListener('activated', (event) => {
            if (!event.isUpdate) {
                console.log('Service worker activated for the first time!');
            } else {
                console.log('Service worker has been updated.');
                // We can reload the page to make sure the user gets the latest version.
                window.location.reload();
            }
        });

        wb.register();
    }
};
