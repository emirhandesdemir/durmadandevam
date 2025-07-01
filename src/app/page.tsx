
// Bu dosya, uygulamanın ana giriş sayfasıdır (`/`).
// Kullanıcı giriş yapmamışsa veya ilk kez ziyaret ediyorsa bu sayfa gösterilir.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import Link from "next/link";
import PwaInstallButton from "@/components/common/PwaInstallButton";
import { useTranslation } from "react-i18next";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  // Kimlik doğrulama durumu kontrolü.
  useEffect(() => {
    // Eğer yükleme bittiyse ve kullanıcı giriş yapmışsa,
    // onu doğrudan ana sayfaya (/home) yönlendir.
    if (!loading && user) {
      router.replace('/home');
    }
  }, [user, loading, router]);

  // Auth durumu belirlenirken bir yükleme animasyonu göster.
  // Bu, sayfanın aniden değişmesini önler ve daha akıcı bir deneyim sunar.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  // Kullanıcı giriş yapmışsa, yönlendirme gerçekleşirken bu component null döndürür.
  if (user) {
    return null;
  }

  // Yükleme tamamlanmışsa ve kullanıcı yoksa, hoş geldin sayfasını göster.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/20 p-4 text-primary">
          <Users className="h-12 w-12" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          {t('welcome_to_hiwewalk')}
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          {t('app_description')}
        </p>
      </div>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <Button asChild size="lg" className="transition-transform hover:scale-105">
          <Link href="/login">{t('login')}</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="transition-transform hover:scale-105">
          <Link href="/signup">{t('signup')}</Link>
        </Button>
        <PwaInstallButton />
      </div>
    </main>
  );
}
