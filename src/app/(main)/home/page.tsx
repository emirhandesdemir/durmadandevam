// src/app/(main)/home/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import PostsFeed from "@/components/posts/PostsFeed";
import FirstPostRewardCard from "@/components/posts/FirstPostRewardCard";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Gönderi akışını ve yeni kullanıcılar için ilk gönderi ödül kartını gösterir.
 */
export default function HomePage() {
  const { userData, loading } = useAuth();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <div className="flex flex-col items-center gap-4">
          {/* Eğer kullanıcı yeni ise ve henüz hiç gönderi paylaşmamışsa, ödül kartını göster. */}
          {!loading && userData?.postCount === 0 && (
             <div className="w-full px-4 pt-4">
                <FirstPostRewardCard />
            </div>
          )}
          {/* Tüm gönderilerin listelendiği ana akış bileşeni. */}
          <PostsFeed />
        </div>
      </main>
    </div>
  );
}
