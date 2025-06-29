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
import PwaInstallBanner from "@/components/common/PwaInstallBanner";

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
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <VoiceChatProvider>
      <NotificationPermissionManager />
      <PwaInstallBanner />
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        <main 
          ref={scrollRef} 
          className={cn(
            "flex-1 flex flex-col pb-24", // Add padding for the bottom nav
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto" // Conditional scrolling
          )}
        >
           <header
              className={cn(
                "sticky top-0 z-40",
                 isHeaderlessPage && "hidden"
              )}
            >
              <Header />
            </header>
          
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
