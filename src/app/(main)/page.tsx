// src/app/(main)/home/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import PostsFeed from "@/components/posts/PostsFeed";
import FirstPostRewardCard from "@/components/posts/FirstPostRewardCard";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, Gem } from "lucide-react";
import Link from 'next/link';

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Tüm kullanıcıların gönderilerini tek bir akışta sunar.
 */
export default function HomePage() {
  const { user, userData, loading } = useAuth();
  
  if (loading || !user || !userData) {
      return (
        <div className="min-h-screen bg-background text-foreground">
            <main>
                <div className="flex flex-col items-center gap-4">
                    <PostsFeed />
                </div>
            </main>
        </div>
      )
  }
  
  const isProfileComplete = !!(userData.bio && userData.age && userData.gender && userData.interests && userData.interests.length > 0 && userData.emailVerified);
  const shouldShowFirstPostReward = (userData.postCount || 0) === 0;

  return (
    <div className="min-h-screen bg-background text-foreground pt-4">
        <div className="flex flex-col items-center gap-4">
            {!isProfileComplete && !userData.profileCompletionAwarded && (
              <div className="w-full px-4">
                <Card className="bg-secondary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCog className="h-6 w-6 text-primary" />
                      Profilini Tamamla!
                    </CardTitle>
                    <CardDescription>
                      Profilindeki eksik bilgileri tamamlayarak hem daha iyi bir deneyim yaşa hem de ödül kazan!
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href="/profile">
                         <Gem className="mr-2 h-4 w-4"/> Profilini Tamamla ve 50 Elmas Kazan
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
             {shouldShowFirstPostReward && (
                <div className="w-full px-4">
                   <FirstPostRewardCard />
                </div>
            )}
            <PostsFeed />
        </div>
    </div>
  );
}
