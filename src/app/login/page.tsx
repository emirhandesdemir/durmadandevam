// src/app/login/page.tsx
"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/login-form";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";

/**
 * Giriş Sayfası
 * 
 * Bu bileşen, kimlik doğrulama durumunu kontrol eder ve kullanıcıyı yönlendirir.
 */
export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Auth yüklemesi bittiğinde ve kullanıcı varsa,
    // kullanıcıyı ana sayfaya yönlendir.
    if (!loading && user) {
        router.replace('/home');
    }
  }, [user, loading, router]);

  // Yükleme veya yönlendirme sırasında bir yükleyici göster.
  if (loading || user) {
    return <AnimatedLogoLoader fullscreen isAuthPage />;
  }
  
  return (
    // Suspense, büyük bileşenlerin yüklenmesini beklerken bir fallback gösterir.
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
        <div className="w-full animate-in zoom-in-95 duration-500">
          <LoginForm />
        </div>
      </main>
    </Suspense>
  );
}