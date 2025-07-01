// src/app/signup/page.tsx
"use client";

import { Suspense } from 'react';
import SignUpPageContent from './SignUpPageContent';

/**
 * Kayıt Sayfası
 * 
 * Bu bileşen, `Suspense` kullanarak sayfa içeriğinin yüklenmesini bekler.
 * Bu, özellikle yavaş bağlantılarda veya büyük bileşenlerde kullanıcı deneyimini iyileştirir.
 * İçerik yüklenene kadar bir yükleme animasyonu gösterilir.
 */
export default function SignUpPage() {
  return (
    <Suspense fallback={
      // `SignUpPageContent` yüklenirken gösterilecek olan arayüz (yükleme animasyonu).
      <div className="flex min-h-screen items-center justify-center auth-bg">
        <div className="h-12 w-12 rounded-full border-4 border-t-white animate-spin"></div>
      </div>
    }>
      {/* Asıl sayfa içeriği */}
      <SignUpPageContent />
    </Suspense>
  );
}
