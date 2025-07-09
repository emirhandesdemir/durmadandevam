'use client';
import { Workbox } from 'workbox-window';

let wb: Workbox | undefined;

export const registerServiceWorker = () => {
    if (process.env.NODE_ENV === 'development') {
        return;
    }
  
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
        wb = new Workbox('/sw.js');
        
        wb.addEventListener('waiting', (event) => {
            // An an 'update' is available, we can ask it to take control immediately.
            console.log('A new service worker is waiting to be activated.');
            wb?.messageSkipWaiting();
        });

        wb.addEventListener('activated', (event) => {
            // This event is fired when the new service worker has taken control.
            // It's a good time to reload the page to use the new assets.
            if (event.isUpdate) {
                console.log('Service worker has been updated. Reloading page...');
                window.location.reload();
            } else {
                console.log('Service worker activated for the first time!');
            }
        });

        wb.register();
    }
};
