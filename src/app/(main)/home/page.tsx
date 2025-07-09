// src/app/(main)/home/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import PostsFeed from "@/components/posts/PostsFeed";
import { Card, CardContent } from "@/components/ui/card";
import { EyeOff, LogOut } from "lucide-react";
import FirstPostRewardCard from "@/components/posts/FirstPostRewardCard";
import NewPostForm from "@/components/posts/NewPostForm";
import { Button } from "@/components/ui/button";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Admin panelinden kontrol edilebilen bir özellik bayrağına göre gönderi akışını gösterir.
 * Ayrıca yeni kullanıcılara ilk gönderi ödül kartını gösterir.
 */
export default function HomePage() {
  const { userData, featureFlags, loading, handleLogout } = useAuth();
  
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-2xl px-4 pt-4">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Geçici Çıkış
              </Button>
            </div>
            <NewPostForm />
          </div>
          {!loading && userData?.postCount === 0 && (
             <div className="w-full px-4">
                <FirstPostRewardCard />
            </div>
          )}
          <PostsFeed />
        </div>
      </main>
    </div>
  );
}
