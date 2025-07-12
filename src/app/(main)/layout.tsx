// src/app/(main)/layout.tsx
'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import VoiceAudioPlayer from "@/components/voice/VoiceAudioPlayer";
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import ActiveCallBar from "@/components/voice/ActiveCallBar";
import PremiumWelcomeManager from "@/components/common/PremiumWelcomeManager";
import UserSearchDialog from "@/components/search/UserSearchDialog";
import { Compass, Map } from "lucide-react";
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


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
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone || sessionStorage.getItem('pwaInstallDismissed') === 'true') {
      return;
    }
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if(isIos) {
        setShowIosInstall(true);
        setIsVisible(true);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => {
      setIsVisible(false);
      setInstallPrompt(null);
    });
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwaInstallDismissed', 'true');
  };
  
  if (!isVisible) {
    return null;
  }

  return (
      <div
        className="relative z-[100] flex items-center justify-center gap-x-4 gap-y-2 bg-primary text-primary-foreground p-3 text-sm font-medium flex-wrap"
      >
        {installPrompt && (
          <>
            <span>Uygulama deneyimini bir üst seviyeye taşı!</span>
            <Button size="sm" onClick={handleInstallClick} className="shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Download className="mr-2 h-4 w-4"/>
              Uygulamayı Yükle
            </Button>
          </>
        )}
        {showIosInstall && !installPrompt && (
            <div className="flex items-center gap-2 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 hidden sm:inline-block"><path d="M12 20v-8"/><path d="M9 15l3-3 3 3"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>
                <span>Uygulamayı ana ekrana eklemek için <strong>Paylaş</strong> simgesine, ardından <strong>"Ana Ekrana Ekle"</strong>ye dokunun.</span>
            </div>
        )}
        <button 
          onClick={handleDismiss} 
          className="absolute top-1 right-1 sm:top-1/2 sm:-translate-y-1/2 rounded-full p-1.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          aria-label="Kapat"
        >
          <X className="h-4 w-4"/>
        </button>
      </div>
  );
}


export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/') || pathname.startsWith('/call/') || pathname.startsWith('/matchmaking/') || pathname.startsWith('/surf');
  const isHomePage = pathname === '/home';
  
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeOut' } },
  };

  return (
    <VoiceChatProvider>
      <PremiumWelcomeManager />
      <div className="relative flex h-screen w-full flex-col bg-background overflow-hidden">
        <PwaInstallBar />
        
        <main 
            className={cn(
            "flex-1 flex flex-col hide-scrollbar",
            isFullPageLayout ? "pb-0" : "pb-16",
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto"
            )}
        >
            {!isFullPageLayout && (
                <header className="sticky top-0 z-40">
                    <Header />
                </header>
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
                        isFullPageLayout ? "overflow-hidden h-full" : "",
                        !isHomePage && !isFullPageLayout && "p-4"
                    )}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </main>
        
        <BottomNav />
        <VoiceAudioPlayer />
        <ActiveCallBar />
      </div>
    </VoiceChatProvider>
  );
}
