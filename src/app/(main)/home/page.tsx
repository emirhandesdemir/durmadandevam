// src/app/(main)/home/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import PostsFeed from "@/components/posts/PostsFeed";
import { Card, CardContent } from "@/components/ui/card";
import { EyeOff } from "lucide-react";
import FirstPostRewardCard from "@/components/posts/FirstPostRewardCard";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Admin panelinden kontrol edilebilen bir özellik bayrağına (feature flag) göre
 * gönderi akışını gösterir veya gizler. Ayrıca yeni kullanıcılara ilk gönderi için
 * bir ödül kartı gösterir.
 */
export default function HomePage() {
  const { userData, featureFlags, loading } = useAuth();
  
  // Özellik bayrağı (feature flag) yüklenirken veya gönderi akışı devre dışı bırakılmışsa
  // kullanıcıya bilgilendirici bir kart göster.
  if (!loading && !featureFlags?.postFeedEnabled) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 border-dashed rounded-3xl">
          <CardContent className="p-0 space-y-4">
            <EyeOff className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Gönderi Akışı Devre Dışı</h3>
            <p className="text-muted-foreground mt-2">
              Bu özellik şu anda bir yönetici tarafından geçici olarak devre dışı bırakılmıştır. Lütfen daha sonra tekrar kontrol edin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gönderi akışı aktifse bu bölüm render edilir.
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Eğer kullanıcı yeni ise ve henüz hiç gönderi paylaşmamışsa, ödül kartını göster. */}
            {!loading && userData?.postCount === 0 && (
               <div className="w-full px-4 pt-4">
                  <FirstPostRewardCard />
              </div>
            )}
            {/* Tüm gönderilerin listelendiği ana akış bileşeni. */}
            <PostsFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
