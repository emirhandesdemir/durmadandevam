// Bu dosya, uygulamanın giriş sayfasını oluşturur.
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/login-form";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const redirectUrl = searchParams.get('redirect') || '/home';
      router.replace(redirectUrl);
    }
  }, [user, loading, router, searchParams]);

  if (loading || user) {
    return <AnimatedLogoLoader fullscreen isAuthPage />;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
      <div className="w-full animate-in zoom-in-95 duration-500">
        <LoginForm />
      </div>
    </main>
  );
}
