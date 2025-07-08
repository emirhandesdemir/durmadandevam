'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { useState, useRef, useEffect } from 'react';
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import NotificationPermissionManager from "@/components/common/NotificationPermissionManager";
import InAppNotificationHandler from "@/components/common/InAppNotificationHandler";
import IncomingCallManager from '@/components/common/IncomingCallManager'; // Import the new component
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
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
  
  if (!isVisible) {
      return null;
  }
  
  return (
        isVisible && installPrompt && (
        <div
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
        </div>
      )
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
  const pathname = usePathname();

  // Bazı sayfaların (oda ve dm detay) tam ekran düzen kullanması ve
  // header göstermemesi gerekir. Bu kontrolü burada yapıyoruz.
  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/') || pathname.startsWith('/call/');
  const isHeaderlessPage = isFullPageLayout;
  const isHomePage = pathname === '/home';

  return (
    <>
      {/* Bildirim izni ve PWA yükleme gibi genel işlemleri yöneten bileşenler. */}
      <NotificationPermissionManager />
      <InAppNotificationHandler />
      <IncomingCallManager />
      <PremiumWelcomeManager />
      
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        {/* PWA yükleme çubuğu */}
        <PwaInstallBar />
        
        {/* Ana içerik alanı */}
        <main 
          className={cn(
            "flex-1 flex flex-col",
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto pb-24" // Tam ekran sayfalarda kaydırmayı engelle.
          )}
        >
           {/* Header'ı olmayan sayfalarda Header'ı render etme. */}
           {!isHeaderlessPage && (
              <header
                className="sticky top-0 z-40"
              >
                <Header />
              </header>
           )}
          
           {/* Sayfa içeriğini render et. */}
             <div
                className={cn(
                  isFullPageLayout ? "flex-1 flex flex-col overflow-hidden" : "",
                  !isHomePage && !isFullPageLayout && "p-4" // Ana sayfa dışındaki normal sayfalara padding ekle.
                )}
             >
              {children}
             </div>
        </main>
        
        <BottomNav />
      </div>
    </>
  );
}
