// src/app/login/page.tsx
"use client";

import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";

/**
 * Giriş Sayfası
 * 
 * Bu bileşen, LoginForm'u gösterir ve yavaş bağlantılarda kullanıcı deneyimini
 * iyileştirmek için Suspense kullanır. AuthProvider, giriş yapmış kullanıcıları
 * otomatik olarak yönlendirecektir.
 */
export default function LoginPage() {
  return (
    // Suspense, LoginForm ve alt bileşenleri yüklenene kadar bir fallback gösterir.
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="w-full max-w-sm animate-in zoom-in-95 duration-500">
                <LoginForm />
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
