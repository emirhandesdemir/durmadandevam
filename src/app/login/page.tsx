// Bu dosya, uygulamanın giriş sayfasını oluşturur.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Kullanıcı zaten giriş yapmışsa, onu ana sayfaya yönlendir.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  // Kimlik doğrulama durumu kontrol edilirken veya kullanıcı zaten varsa,
  // bir yükleme animasyonu göster. Bu, sayfa geçişlerinde ani içerik değişimini önler.
  if (loading || user) {
    return (
       <div className="flex min-h-screen items-center justify-center auth-bg">
        <div className="h-12 w-12 rounded-full border-4 border-t-white animate-spin"></div>
      </div>
    );
  }

  // Kullanıcı giriş yapmamışsa, giriş formunu göster.
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
      <div className="w-full animate-in zoom-in-95 duration-500">
        <LoginForm />
      </div>
    </main>
  );
}
