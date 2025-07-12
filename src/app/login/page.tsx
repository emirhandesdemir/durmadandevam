// Bu dosya, uygulamanın giriş sayfasını oluşturur.
"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/login-form";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";

/**
 * Giriş Sayfası
 * 
 * Bu bileşen, kimlik doğrulama durumunu kontrol eder ve kullanıcıyı yönlendirir.
 * Ayrıca, hesap değiştirme akışından gelen `prefilledEmail` bilgisini alarak
 * LoginForm'a iletir.
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, addPersistedUser } = useAuth();

  useEffect(() => {
    // Auth yüklemesi bittiğinde ve kullanıcı varsa,
    // kullanıcıyı listeye ekle ve ana sayfaya yönlendir.
    if (!loading && user) {
        addPersistedUser(user);
        const redirectUrl = searchParams.get('redirect') || '/home';
        router.replace(redirectUrl);
    }
  }, [user, loading, router, searchParams, addPersistedUser]);

  // Yükleme veya yönlendirme sırasında bir yükleyici göster.
  if (loading || user) {
    return <AnimatedLogoLoader fullscreen isAuthPage />;
  }
  
  // URL'den önceden doldurulmuş e-posta adresini al (hesap değiştirme için).
  const prefilledEmail = searchParams.get('email') || '';

  return (
    // Suspense, büyük bileşenlerin yüklenmesini beklerken bir fallback gösterir.
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
        <div className="w-full animate-in zoom-in-95 duration-500">
          <LoginForm prefilledEmail={prefilledEmail} />
        </div>
      </main>
    </Suspense>
  );
}
