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
import NotificationPermissionManager from "@/components/common/NotificationPermissionManager";
import PwaInstallBar from "@/components/common/PwaInstallBar";

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
    // Header is not rendered on headerless pages, so we don't need to check for it here.
    // This hook now only controls the scroll-based hiding on pages that *do* have a header.
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <VoiceChatProvider>
      <NotificationPermissionManager />
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        <PwaInstallBar />
        <main 
          ref={scrollRef} 
          className={cn(
            "flex-1 flex flex-col",
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto pb-24"
          )}
        >
           {!isHeaderlessPage && (
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
           )}
          
           <div className={cn(
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
