
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // PWA olarak çalışıyorsa gösterme
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
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
    });
  };
  
  if (!installPrompt) {
    return null;
  }

  return (
    <Button 
      size="lg"
      variant="secondary"
      onClick={handleInstallClick}
      className="transition-transform hover:scale-105"
    >
        <Download className="mr-2 h-5 w-5" />
        Uygulamayı Yükle
    </Button>
  );
}
