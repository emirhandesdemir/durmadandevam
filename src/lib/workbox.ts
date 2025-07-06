'use client';
import { Workbox } from 'workbox-window';

let wb: Workbox | undefined;

export const registerServiceWorker = () => {
    if (process.env.NODE_ENV === 'development') {
        return;
    }
  
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
        wb = new Workbox('/sw.js');
        
        // Listen for the 'waiting' event, which indicates a new version is ready.
        wb.addEventListener('waiting', () => {
            // Dispatch a custom event that the UI can listen for.
            // Pass the workbox instance so the UI can call messageSkipWaiting.
            const event = new CustomEvent('sw-update', { detail: wb });
            window.dispatchEvent(event);
        });

        wb.addEventListener('activated', (event) => {
            if (!event.isUpdate) {
                console.log('Service worker activated for the first time!');
            } else {
                console.log('Service worker has been updated.');
                // Reload the page to make sure the user gets the latest version.
                window.location.reload();
            }
        });

        wb.register();
    }
};
