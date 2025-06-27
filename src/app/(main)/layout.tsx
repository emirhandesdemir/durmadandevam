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
      <div className="relative flex min-h-screen w-full flex-col bg-background">
        <Header />
        {/* Ana içerik alanı, alt navigasyonun kaplayacağı alanı boş bırakmak için alttan padding alır */}
        <main className="flex-1 pb-16">{children}</main>
        
        {/* Sesli sohbet ve diğer sabit durum çubukları */}
        <VoiceAudioPlayer />
        <PersistentVoiceBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
