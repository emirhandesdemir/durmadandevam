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

// PwaInstallButton component is moved here to consolidate files.
function PwaInstallButton() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if already in standalone mode
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setInstallPrompt(null);
    });
  };
  
  if (!installPrompt) {
    return null;
  }

  return (
    <Button 
      size="lg"
      variant="secondary"
      onClick={handleInstallClick}
      className="transition-transform hover:scale-105"
    >
        <Download className="mr-2 h-5 w-5" />
        {t('install_app')}
    </Button>
  );
}


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
        <div className="rounded-full bg-primary/20 p-4 text-primary">
          <Users className="h-12 w-12" />
        </div>
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
        <PwaInstallButton />
      </div>
    </main>
  );
}
