// Bu dosya, uygulamanın ana giriş sayfasıdır (`/`).
// Kullanıcı giriş yapmamışsa veya ilk kez ziyaret ediyorsa bu sayfa gösterilir.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users, Download } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const { user, loading, themeSettings } = useAuth();
  const { t } = useTranslation();

  // Authentication status check.
  useEffect(() => {
    // If loading is finished and the user is logged in,
    // redirect them directly to the main page (/home).
    if (!loading && user) {
      router.replace('/home');
    }
  }, [user, loading, router]);

  // Show a loading animation while the auth state is being determined.
  // This prevents the page from changing abruptly and provides a smoother experience.
  if (loading) {
    return <AnimatedLogoLoader fullscreen />;
  }
  
  // If the user is logged in, this component returns null while the redirect happens.
  if (user) {
    return null;
  }

  // If loading is complete and there is no user, show the welcome page.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-4">
        <Image src="/icons/icon.svg" alt="HiweWalk Logo" width={80} height={80} className="h-20 w-20" />
        <h1 className="text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          {t('welcome_to_hiwewalk', { appName: themeSettings?.appName || 'HiweWalk' })}
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
      </div>
    </main>
  );
}