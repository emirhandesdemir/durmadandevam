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

  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/');

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    // Don't hide header on full-page layouts that have their own internal scroll
    if (isFullPageLayout) {
      setHidden(false);
      return;
    }
    // Hide header on scroll down, show on scroll up
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
        {/* On full page layouts, the child itself handles scrolling. Otherwise, this main tag does. */}
        <main ref={scrollRef} className={cn("flex-1 overflow-y-auto", !isFullPageLayout && "pb-24")}>
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
          
           <div className={cn(!isHomePage && !isFullPageLayout && "p-4")}>
            {children}
          </div>
        </main>
        
        {/* Persistent UI elements are fixed to the viewport */}
        <VoiceAudioPlayer />
        <PersistentVoiceBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
