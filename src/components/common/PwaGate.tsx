'use client';

import { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';

export default function PwaGate() {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // Check if running in browser and not as a standalone PWA
    if (typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches) {
      // Small delay to prevent flash of content
      const timer = setTimeout(() => setIsBrowser(true), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isBrowser) {
    return null; // If it's a PWA or the check hasn't run, render nothing.
  }

  // If it's a browser, show the blocking overlay.
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
