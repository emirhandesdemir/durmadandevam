// src/app/(main)/home/page.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import PostsFeed from "@/components/posts/PostsFeed";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, BadgeCheck } from "lucide-react";
import Link from 'next/link';

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Gönderi akışını ve yeni kullanıcılar için çeşitli bilgilendirme kartlarını gösterir.
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

  const getIncompleteProfileStep = () => {
      if (!userData.bio) return { action: 'Biyografi Ekle', focusId: '#bio' };
      if (!userData.age) return { action: 'Yaşını Ekle', focusId: '#age' };
      if (!userData.gender) return { action: 'Cinsiyetini Seç', focusId: '#gender' };
      if (!userData.interests || userData.interests.length === 0) return { action: 'İlgi Alanı Ekle', focusId: '#interests' };
      if (!user.emailVerified) return { action: 'Hesabını Doğrula', focusId: '#account-security'};
      return null;
  }

  const incompleteStep = getIncompleteProfileStep();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <div className="flex flex-col items-center gap-4">
          {incompleteStep && (
            <div className="w-full px-4 pt-4">
              <Card className="bg-secondary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-6 w-6 text-primary" />
                    Profilini Tamamla!
                  </CardTitle>
                  <CardDescription>
                    {incompleteStep.action === 'Hesabını Doğrula'
                        ? "Hesabını doğrulayarak mavi tik kazan ve topluluktaki güvenilirliğini artır."
                        : "Tüm özellikleri kullanabilmek ve daha iyi eşleşmeler bulmak için profilindeki eksik bilgileri tamamla."
                    }
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/profile${incompleteStep.focusId}`}>
                      {incompleteStep.action === 'Hesabını Doğrula' && <BadgeCheck className="mr-2 h-4 w-4"/>}
                      {incompleteStep.action}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          <PostsFeed />
        </div>
      </main>
    </div>
  );
}
