// Bu dosya, yeni kayıt olan kullanıcıların profil kurulumunu yaptığı "Onboarding" (Alıştırma) sayfasını yönetir.
// Kullanıcıyı adım adım profil resmi, biyografi ve takip edeceği kişileri seçmeye yönlendirir.
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { updateUserProfile } from '@/lib/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Sparkles, User, ArrowRight } from 'lucide-react';

function OnboardingWelcome() {
    const { user } = useAuth();
    return (
        <div className="text-center">
            <h1 className="text-3xl font-bold">Hoş geldin, {user?.displayName}!</h1>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Harika bir başlangıç için profilini birlikte oluşturalım ve seni yansıtan bir avatar yaratalım.</p>
             <Card className="mt-8 text-left">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> Avatar Stüdyosu</CardTitle>
                    <CardDescription>Yapay zeka ile benzersiz bir profil resmi oluştur.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">Metin komutlarıyla hayalindeki karakteri yarat veya kendi fotoğrafını sanatsal bir portreye dönüştür.</p>
                    <Button asChild className="mt-4 w-full">
                        <Link href="/avatar-studio">Stüdyoya Git <ArrowRight className="ml-2 h-4 w-4"/></Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="mt-4 text-left">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> Profil Bilgileri</CardTitle>
                    <CardDescription>Diğer kullanıcıların seni daha iyi tanımasını sağla.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">Biyografi, yaş, şehir ve ilgi alanlarını düzenleyerek profilini zenginleştir.</p>
                     <Button asChild variant="secondary" className="mt-4 w-full">
                        <Link href="/profile">Profili Düzenle <ArrowRight className="ml-2 h-4 w-4"/></Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}


export default function OnboardingPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // If auth is done loading and there's no user, redirect to signup
    if (!authLoading && !user) {
      router.replace('/signup');
    }
    // If user data is loaded and they have a bio, they've probably completed onboarding.
    if (userData && (userData.bio || (userData.postCount || 0) > 0)) {
        router.replace('/home');
    }
  }, [user, userData, authLoading, router]);


  if (authLoading || !user || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md mx-auto">
            <div className="animate-in fade-in-50 duration-500">
                <OnboardingWelcome />
            </div>
            <div className="mt-8">
                <Button variant="outline" onClick={() => router.push('/home')}>Daha Sonra</Button>
            </div>
        </div>
    </div>
  );
}
