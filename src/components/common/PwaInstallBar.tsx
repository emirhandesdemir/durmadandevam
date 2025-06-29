'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}


export default function PwaInstallBar() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Check if the bar was dismissed before
      if (sessionStorage.getItem('pwaInstallDismissed') !== 'true') {
        setIsVisible(true);
      }
    };

    // Don't show if already in standalone mode
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setIsVisible(false);
      setInstallPrompt(null);
    });
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwaInstallDismissed', 'true');
  };
  
  return (
    <AnimatePresence>
      {isVisible && installPrompt && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative z-[100] flex items-center justify-center gap-x-4 gap-y-2 bg-secondary text-secondary-foreground p-3 text-sm font-medium flex-wrap"
        >
          <span>Uygulama deneyimini bir üst seviyeye taşı!</span>
          <Button size="sm" onClick={handleInstallClick} className="shrink-0">
            <Download className="mr-2 h-4 w-4"/>
            Uygulamayı Yükle
          </Button>
          <button 
            onClick={handleDismiss} 
            className="absolute top-1 right-1 sm:top-1/2 sm:-translate-y-1/2 rounded-full p-1.5 text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-black/10 transition-colors"
            aria-label="Kapat"
          >
            <X className="h-4 w-4"/>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
