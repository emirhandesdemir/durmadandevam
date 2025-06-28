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

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    // DM sayfasında kendi kaydırma çubuğu olduğu için gizleme
    if (pathname.startsWith('/dm')) {
      setHidden(false);
      return;
    }
    // Aşağı kaydırınca gizle, yukarı kaydırınca göster
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });
  
  const isHomePage = pathname === '/home';

  return (
    <VoiceChatProvider>
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        {/* Ana içerik alanı artık kaydırma kabı olarak davranıyor */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto pb-24">
           {/* Header artık kaydırılabilir alanın İÇİNDE ve STICKY */}
           <motion.header
              variants={{
                visible: { y: 0 },
                hidden: { y: "-100%" },
              }}
              animate={hidden ? "hidden" : "visible"}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="sticky top-0 z-40"
            >
              <Header />
            </motion.header>
          
           <div className={cn(!isHomePage && "p-4")}>
            {children}
          </div>
        </main>
        
        {/* Kalıcı UI elemanları görünüm alanına sabitlenir */}
        <VoiceAudioPlayer />
        <PersistentVoiceBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
