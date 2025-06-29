'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import Image from 'next/image';

export default function PwaInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // PWA olarak çalışıyorsa veya daha önce kapatıldıysa gösterme
    if (window.matchMedia('(display-mode: standalone)').matches || localStorage.getItem('pwaInstallBannerDismissed')) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setInstallPrompt(null);
      setIsVisible(false);
    });
  };

  const handleCloseClick = () => {
    setIsVisible(false);
    localStorage.setItem('pwaInstallBannerDismissed', 'true');
  };

  if (!isVisible || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] bg-background/80 backdrop-blur-md border-b p-3 animate-in fade-in-50 slide-in-from-top-5 duration-500">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <Image src="/icons/icon-192x192.png" alt="HiweWalk Logo" width={40} height={40} className="rounded-lg"/>
            <div>
                 <h3 className="font-bold text-sm sm:text-base text-foreground">HiweWalk Uygulamasını Yükle</h3>
                 <p className="text-xs sm:text-sm text-muted-foreground">Daha iyi bir deneyim için ana ekranınıza ekleyin.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleInstallClick}>
                <Download className="mr-2 h-4 w-4"/>
                Yükle
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleCloseClick}>
                <X className="h-4 w-4"/>
                <span className="sr-only">Kapat</span>
            </Button>
        </div>
      </div>
    </div>
  );
}
