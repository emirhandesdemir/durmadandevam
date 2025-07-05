// src/app/signup/page.tsx
"use client";

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SignUpForm from '@/components/auth/signup-form';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

function SignUpPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  if (loading || user) {
     return <AnimatedLogoLoader fullscreen isAuthPage />;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
      <div className="w-full animate-in zoom-in-95 duration-500">
        <SignUpForm />
      </div>
    </main>
  );
}


/**
 * Kayıt Sayfası
 * 
 * Bu bileşen, `Suspense` kullanarak sayfa içeriğinin yüklenmesini bekler.
 * Bu, özellikle yavaş bağlantılarda veya büyük bileşenlerde kullanıcı deneyimini iyileştirir.
 * İçerik yüklenene kadar bir yükleme animasyonu gösterilir.
 */
export default function SignUpPage() {
  return (
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      {/* Asıl sayfa içeriği */}
      <SignUpPageContent />
    </Suspense>
  );
}
