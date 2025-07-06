// src/app/(main)/layout.tsx
'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import VoiceAudioPlayer from "@/components/voice/VoiceAudioPlayer";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import ActiveCallBar from "@/components/voice/ActiveCallBar";
import PremiumWelcomeManager from "@/components/common/PremiumWelcomeManager";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

function PwaInstallBar() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      if (sessionStorage.getItem('pwaInstallDismissed') !== 'true') {
        setIsVisible(true);
      }
    };

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


/**
 * Ana Uygulama Düzeni (Main App Layout)
 * 
 * Bu bileşen, kullanıcı giriş yaptıktan sonra görünen tüm sayfalar için
 * genel bir çerçeve (iskelet) oluşturur. Header, BottomNav, sesli sohbet
 * bileşenleri ve sayfa geçiş animasyonları gibi ortak UI elemanlarını içerir.
 */
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();

  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/') || pathname.startsWith('/call/');
  const isHeaderlessPage = isFullPageLayout;
  const isHomePage = pathname === '/home';

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.4, ease: "easeInOut" } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: "easeOut" } },
  };


  return (
    <VoiceChatProvider>
      <PremiumWelcomeManager />
      
      <div className="relative flex h-screen w-full flex-col bg-background overflow-hidden">
        <PwaInstallBar />
        
        <main 
          ref={scrollRef} 
          className={cn(
            "flex-1 flex flex-col hide-scrollbar pb-20",
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto"
          )}
        >
           {!isHeaderlessPage && (
              <motion.header
                variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
                animate={hidden ? "hidden" : "visible"}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="sticky top-0 z-40"
              >
                <Header />
              </motion.header>
           )}
          
           <AnimatePresence mode="wait">
             <motion.div
                key={pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  "flex-1 flex flex-col",
                  isFullPageLayout ? "overflow-hidden" : "",
                  !isHomePage && !isFullPageLayout && "p-4"
                )}
             >
              {children}
             </motion.div>
           </AnimatePresence>
        </main>
        
        <VoiceAudioPlayer />
        <ActiveCallBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
