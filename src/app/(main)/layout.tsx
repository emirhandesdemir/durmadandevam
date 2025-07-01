'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import PersistentVoiceBar from "@/components/voice/PersistentVoiceBar";
import VoiceAudioPlayer from "@/components/voice/VoiceAudioPlayer";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import NotificationPermissionManager from "@/components/common/NotificationPermissionManager";
import PwaInstallBar from "@/components/common/PwaInstallBar";
import InAppNotificationHandler from "@/components/common/InAppNotificationHandler";

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
  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/');
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
      <InAppNotificationHandler />
      
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        {/* PWA yükleme çubuğu */}
        <PwaInstallBar />
        
        {/* Ana içerik alanı */}
        <main 
          ref={scrollRef} 
          className={cn(
            "flex-1 flex flex-col",
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
                  isFullPageLayout ? "flex-1 flex flex-col overflow-hidden" : "",
                  !isHomePage && !isFullPageLayout && "p-4" // Ana sayfa dışındaki normal sayfalara padding ekle.
                )}
             >
              {children}
             </motion.div>
           </AnimatePresence>
        </main>
        
        {/* Her zaman aktif olan sesli sohbet bileşenleri. */}
        <VoiceAudioPlayer />
        <PersistentVoiceBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
