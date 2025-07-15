// src/app/signup/page.tsx
"use client";

import { Suspense } from 'react';
import SignUpForm from '@/components/auth/signup-form';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';

function SignUpPageContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AnimatedLogoLoader fullscreen isAuthPage />;
  }
  
  if (user) {
    redirect('/home');
  }

  return (
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
  );
}


/**
 * Kayıt Sayfası
 * 
 * Bu bileşen, SignUpForm'u gösterir ve yavaş bağlantılarda kullanıcı deneyimini
 * iyileştirmek için Suspense kullanır. AuthProvider, kayıt sonrası kullanıcıyı
 * otomatik olarak yönlendirecektir.
 */
export default function SignUpPage() {
  return (
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      <SignUpPageContent />
    </Suspense>
  );
}
