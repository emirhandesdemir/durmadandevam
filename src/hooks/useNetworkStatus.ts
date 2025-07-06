
// Bu custom hook, kullanıcının internet bağlantısının
// durumunu (çevrimiçi/çevrimdışı) takip eder.
'use client';
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  // `navigator.onLine`'dan gelen ilk değeri alarak state'i başlat.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sunucu tarafında `window` nesnesi olmadığı için, ilk kontrolü istemcide yap.
    const getInitialStatus = () => typeof window.navigator.onLine === 'undefined' ? true : window.navigator.onLine;

    setIsOnline(getInitialStatus());

    // Tarayıcının 'online' ve 'offline' olaylarını dinle.
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Bileşen DOM'dan kaldırıldığında (unmount) olay dinleyicilerini temizle.
    // Bu, hafıza sızıntılarını önler.
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
