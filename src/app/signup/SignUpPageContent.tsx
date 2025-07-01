// src/app/signup/SignUpPageContent.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import SignUpForm from "@/components/auth/signup-form";

/**
 * Bu bileşen, kayıt sayfasının ana içeriğini ve mantığını yönetir.
 * `Suspense` ile sarmalanarak, sayfa yüklenirken bir yedek (fallback)
 * arayüz gösterilmesine olanak tanır.
 */
export default function SignUpPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Kullanıcı zaten giriş yapmışsa, onu ana sayfaya yönlendir.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  // Kimlik doğrulama durumu kontrol edilirken veya kullanıcı zaten varsa,
  // bir yükleme animasyonu göster.
  if (loading || user) {
     return (
       <div className="flex min-h-screen items-center justify-center auth-bg">
        <div className="h-12 w-12 rounded-full border-4 border-t-white animate-spin"></div>
      </div>
    );
  }

  // Kullanıcı giriş yapmamışsa, kayıt formunu göster.
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
      <div className="w-full animate-in zoom-in-95 duration-500">
        <SignUpForm />
      </div>
    </main>
  );
}
