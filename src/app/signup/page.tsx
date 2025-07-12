// src/app/signup/page.tsx
"use client";

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SignUpForm from '@/components/auth/signup-form';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

/**
 * Kayıt Sayfası
 * 
 * Bu bileşen, `Suspense` kullanarak sayfa içeriğinin yüklenmesini bekler.
 * Bu, özellikle yavaş bağlantılarda veya büyük bileşenlerde kullanıcı deneyimini iyileştirir.
 * İçerik yüklenene kadar bir yükleme animasyonu gösterilir.
 */
export default function SignUpPage() {
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
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      {/* Asıl sayfa içeriği */}
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="w-full max-w-sm animate-in zoom-in-95 duration-500">
                <SignUpForm />
            </div>
        </div>
         <footer className="py-4">
            <p className="text-xs text-white/70">
                © 2025 BeWalk. All rights reserved.
            </p>
        </footer>
      </main>
    </Suspense>
  );
}
