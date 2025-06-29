'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import PersistentVoiceBar from "@/components/voice/PersistentVoiceBar";
import VoiceAudioPlayer from "@/components/voice/VoiceAudioPlayer";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isHeaderlessPage = (pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/dm/') && pathname !== '/dm');
  const isFullPageLayout = isHeaderlessPage;
  const isHomePage = pathname === '/home';

  return (
    <VoiceChatProvider>
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        <main 
          className={cn(
            "flex-1 flex flex-col", // Always a flex container
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto" // Conditional scrolling
          )}
        >
           {!isHeaderlessPage && (
              <header className="sticky top-0 z-40">
                <Header />
              </header>
           )}
          
           <div className={cn(
             // For full-page layouts, make the wrapper a flex container that grows
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
