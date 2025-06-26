// src/app/(main)/layout.tsx
// Bu, ana uygulama düzenidir (giriş, kayıt ve admin paneli dışındaki sayfalar).
// Alt navigasyon çubuğunu içerir ve içeriği onun üstünde gösterir.

import BottomNav from "@/components/layout/bottom-nav";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import PersistentVoiceBar from "@/components/voice/PersistentVoiceBar";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VoiceChatProvider>
      <div className="relative flex min-h-screen w-full flex-col bg-background">
        {/* Ana içerik alanı, alt navigasyonun kaplayacağı alanı boş bırakmak için alttan padding alır */}
        <main className="flex-1 pb-20">{children}</main>
        
        {/* Sabit durum çubukları */}
        <PersistentVoiceBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
