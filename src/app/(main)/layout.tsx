// src/app/(main)/layout.tsx
// Bu, ana uygulama düzenidir (giriş, kayıt ve admin paneli dışındaki sayfalar).
// Üst ve alt navigasyon çubuklarını içerir ve içeriği onların arasında gösterir.

import BottomNav from "@/components/layout/bottom-nav";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import PersistentVoiceBar from "@/components/voice/PersistentVoiceBar";
import VoiceAudioPlayer from "@/components/voice/VoiceAudioPlayer";
import Header from "@/components/layout/Header";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VoiceChatProvider>
      {/* 
        This is now a flex container that takes up the dynamic viewport height (h-dvh).
        This provides a stable structure for children layouts.
      */}
      <div className="flex h-dvh w-full flex-col bg-background">
        <Header />
        {/* 
          The main content area now fills the remaining space and handles its own scrolling
          for pages with long content (like the home feed).
        */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        
        {/* Voice chat components are outside the main scroll area */}
        <VoiceAudioPlayer />
        <PersistentVoiceBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
