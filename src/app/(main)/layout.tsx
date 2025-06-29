'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import PersistentVoiceBar from "@/components/voice/PersistentVoiceBar";
import VoiceAudioPlayer from "@/components/voice/VoiceAudioPlayer";
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState, useRef } from 'react';
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();

  const isHeaderlessPage = (pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/dm/') && pathname !== '/dm');
  const isFullPageLayout = isHeaderlessPage;
  const isHomePage = pathname === '/home';

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (isHeaderlessPage) {
      setHidden(true);
      return;
    }
    // 150px'ten fazla kaydırıldıysa ve aşağı doğruysa gizle
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <VoiceChatProvider>
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        <main 
          ref={scrollRef} 
          className={cn(
            "flex-1 flex flex-col", // Her zaman esnek bir kapsayıcı
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto" // Koşullu kaydırma
          )}
        >
           <motion.header
              variants={{
                visible: { y: 0, height: 'auto' },
                hidden: { y: "-100%", height: 0, transition: { duration: 0.2 } },
              }}
              animate={hidden || isHeaderlessPage ? "hidden" : "visible"}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="sticky top-0 z-40 overflow-hidden"
            >
              <Header />
            </motion.header>
          
           <div className={cn(
             // Tam sayfa düzenleri için sarmalayıcıyı büyüyen bir esnek kapsayıcı yap
             isFullPageLayout ? "flex-1 flex flex-col overflow-hidden" : "",
             !isHomePage && !isFullPageLayout && "p-4"
            )}
           >
            {children}
           </div>
        </main>
        
        <VoiceAudioPlayer />
        <PersistentVoiceBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
