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
import NotificationPermissionManager from "@/components/common/NotificationPermissionManager";
import IncomingCallManager from '@/components/common/IncomingCallManager';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import ActiveCallBar from "@/components/voice/ActiveCallBar";

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

  // Bazı sayfaların (oda ve dm detay) tam ekran düzen kullanması ve
  // header göstermemesi gerekir. Bu kontrolü burada yapıyoruz.
  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/') || pathname.startsWith('/call/');
  const isHeaderlessPage = isFullPageLayout;
  const isHomePage = pathname === '/home';

  // Sayfa kaydırıldığında header'ı gizlemek için Framer Motion hook'u.
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    // Sadece header'ı olan sayfalarda bu mantığı çalıştır.
    if (latest > previous && latest > 150) {
      setHidden(true); // Aşağı kaydırırken gizle.
    } else {
      setHidden(false); // Yukarı kaydırırken göster.
    }
  });

  // Sayfa geçişleri için animasyon varyantları.
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 260, damping: 30 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  return (
    <VoiceChatProvider>
      {/* Bildirim izni ve PWA yükleme gibi genel işlemleri yöneten bileşenler. */}
      <NotificationPermissionManager />
      <IncomingCallManager />
      
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        {/* PWA yükleme çubuğu */}
        <PwaInstallBar />
        
        {/* Ana içerik alanı */}
        <main 
          ref={scrollRef} 
          className={cn(
            "flex-1 flex flex-col hide-scrollbar",
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto pb-24" // Tam ekran sayfalarda kaydırmayı engelle.
          )}
        >
           {/* Header'ı olmayan sayfalarda Header'ı render etme. */}
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
          
           {/* Sayfa içeriğini animasyonlu bir şekilde render et. */}
           <AnimatePresence mode="wait">
             <motion.div
                key={pathname} // Pathname değiştiğinde animasyon tetiklenir.
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  "flex-1 flex flex-col", // flex-1 ve flex-col ekleyerek içeriğin tüm alanı kaplamasını sağla
                  isFullPageLayout ? "overflow-hidden" : "",
                  !isHomePage && !isFullPageLayout && "p-4" // Ana sayfa dışındaki normal sayfalara padding ekle.
                )}
             >
              {children}
             </motion.div>
           </AnimatePresence>
        </main>
        
        {/* Her zaman aktif olan sesli sohbet bileşenleri. */}
        <VoiceAudioPlayer />
        <ActiveCallBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
