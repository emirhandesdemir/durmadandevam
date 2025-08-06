// src/hooks/useDebounce.ts
'use client';

import { useState, useEffect } from 'react';

/**
 * Bir değeri geciktirerek (debounce) güncelleyen bir custom hook.
 * Özellikle kullanıcı girdisi gibi sık tetiklenen olaylarda,
 * gereksiz yere işlem yapılmasını önlemek için kullanılır.
 * @param value Geciktirilecek değer (örn: arama terimi).
 * @param delay Gecikme süresi (milisaniye cinsinden).
 * @returns Geciktirilmiş değer.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // `value` değiştiğinde bir zamanlayıcı başlat.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Bir sonraki `useEffect` çalışmadan veya bileşen unmount olduğunda
    // önceki zamanlayıcıyı temizle.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
