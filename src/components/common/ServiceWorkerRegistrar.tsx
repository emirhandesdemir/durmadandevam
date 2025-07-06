'use client';

import { useEffect } from 'react';
import { Workbox } from 'workbox-window';

/**
 * Bu bileşen, PWA'nın servis çalışanını (service worker) tarayıcıya kaydeder
 * ve güncelleme döngüsünü yönetir.
 * Root layout'a eklenerek uygulamanın her açılışında çalışması sağlanır.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Geliştirme ortamında servis çalışanını kaydetme.
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    if ('serviceWorker' in navigator) {
      const wb = new Workbox('/sw.js');

      // 'waiting' olayı, yeni bir servis çalışanının aktif olmak için beklediğini gösterir.
      // Kullanıcıya "güncelleme var" bildirimi göstermek yerine,
      // otomatik olarak yeni sürümü aktif ediyoruz.
      wb.addEventListener('waiting', () => {
        console.log('New service worker is waiting to be activated.');
        wb.messageSkipWaiting();
      });

      // 'activated' olayı, yeni servis çalışanının kontrolü ele aldığını gösterir.
      // Eğer bu bir güncelleme ise, sayfayı yeniden yükleyerek kullanıcının
      // en yeni varlıkları (assets) kullanmasını sağlıyoruz.
      wb.addEventListener('activated', (event) => {
        if (event.isUpdate) {
          console.log('Service worker has been updated. Reloading page...');
          window.location.reload();
        } else {
          console.log('Service worker activated for the first time!');
        }
      });
      
      // Servis çalışanını kaydet.
      wb.register();
    }
  }, []);

  // Bu bileşen arayüzde bir şey render etmez.
  return null; 
}
