// src/app/(main)/home/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import PostsFeed from "@/components/posts/PostsFeed";
import FirstPostRewardCard from "@/components/posts/FirstPostRewardCard";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog } from "lucide-react";
import Link from 'next/link';

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Gönderi akışını ve yeni kullanıcılar için çeşitli bilgilendirme kartlarını gösterir.
 */
export default function HomePage() {
  const { userData, loading } = useAuth();
  
  // Profilin tamamlanıp tamamlanmadığını kontrol et (bio alanı boş mu?)
  const isProfileIncomplete = !loading && userData && !userData.bio;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <div className="flex flex-col items-center gap-4">
          {/* Eğer kullanıcının profili eksikse, tamamlama kartını göster. */}
          {isProfileIncomplete && (
            <div className="w-full px-4 pt-4">
              <Card className="bg-secondary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-6 w-6 text-primary" />
                    Profilini Tamamla!
                  </CardTitle>
                  <CardDescription>
                    Kendini daha iyi tanıtmak ve diğer özelliklerin kilidini açmak için profiline bir biyografi ekle.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/profile">Hemen Tamamla</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

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
