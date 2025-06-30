// src/app/(main)/home/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import PostsFeed from "@/components/posts/PostsFeed";
import { Card, CardContent } from "@/components/ui/card";
import { EyeOff } from "lucide-react";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Artık admin panelinden kontrol edilebilen bir özellik bayrağına göre gönderi akışını gösterir.
 */
export default function HomePage() {
  const { featureFlags, loading } = useAuth();
  
  // Özellik bayrağı yüklenirken veya devre dışı bırakılmışsa farklı bir içerik göster
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

  return (
    // Sayfanın ana sarmalayıcısı, arka plan rengini ve minimum yüksekliği ayarlar.
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <div className="flex flex-col items-center gap-8 p-4 max-w-2xl mx-auto">
          <PostsFeed />
        </div>
      </main>
    </div>
  );
}
