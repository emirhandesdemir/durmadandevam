
'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import ActiveCallBar from "@/components/voice/ActiveCallBar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import NotificationPermissionManager from "@/components/common/NotificationPermissionManager";
import PremiumWelcomeManager from "@/components/common/PremiumWelcomeManager";

/**
 * Ana Uygulama Düzeni (Main App Layout)
 * 
 * Bu bileşen, kullanıcı giriş yaptıktan sonra görünen tüm sayfalar için
 * genel bir çerçeve (iskelet) oluşturur. Header, BottomNav gibi ortak 
 * UI elemanlarını içerir.
 */
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Bazı sayfaların (oda ve dm detay) tam ekran düzen kullanması ve
  // header göstermemesi gerekir. Bu kontrolü burada yapıyoruz.
  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/');
  const isHeaderlessPage = isFullPageLayout;
  const isHomePage = pathname === '/home';


  return (
    <VoiceChatProvider>
      <NotificationPermissionManager />
      <PremiumWelcomeManager />
      
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        
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
          
           <div
                className={cn(
                  "flex-1 flex flex-col",
                  isFullPageLayout ? "overflow-hidden" : "",
                  !isHomePage && !isFullPageLayout && "p-4"
                )}
             >
              {children}
             </div>
        </main>
        
        {/* Her zaman aktif olan sesli sohbet bileşenleri. */}
        <ActiveCallBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
