// Bu bileşen, uygulamanın yalnızca PWA (ana ekrana eklenmiş uygulama)
// olarak kullanılmasını zorunlu kılmak için tasarlanmıştı.
// Ancak kullanıcı isteği üzerine bu zorunluluk kaldırıldığı için
// bu bileşen artık projede kullanılmamaktadır ve silinebilir.
'use client';

import { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';

export default function PwaGate() {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // Tarayıcıda çalışıp çalışmadığını ve PWA modunda olmadığını kontrol et.
    if (typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches) {
      // İçeriğin anlık parlamasını önlemek için küçük bir gecikme.
      const timer = setTimeout(() => setIsBrowser(true), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isBrowser) {
    // Eğer bir PWA ise veya kontrol henüz çalışmadıysa, hiçbir şey gösterme.
    return null; 
  }

  // Eğer bir tarayıcıda çalışıyorsa, engelleyici overlay'i göster.
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm text-center p-8 animate-in fade-in duration-300">
      <Rocket className="h-16 w-16 text-primary mb-6 animate-pulse" />
      <h1 className="text-3xl font-bold">Daha İyi Bir Deneyim İçin</h1>
      <p className="mt-2 text-lg text-muted-foreground max-w-md">
        Uygulamanın tüm özelliklerinden faydalanmak ve daha güvenli bir kullanım için lütfen uygulamayı ana ekranınızdan başlatın.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        (Bu pencere, uygulama ana ekrandan açıldığında otomatik olarak kaybolacaktır.)
      </p>
    </div>
  );
}
