// src/app/(main)/home/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ActiveRooms from "@/components/home/ActiveRooms";
import NewPost from "@/components/home/NewPost";
import PostsFeed from "@/components/home/PostsFeed";
import WelcomeCard from "@/components/home/WelcomeCard";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Sayfa, 4 ana bileşenden oluşur:
 * 1. WelcomeCard: Kullanıcıyı oda oluşturmaya teşvik eden kart.
 * 2. NewPost: Kullanıcının yeni gönderi oluşturabileceği alan.
 * 3. PostsFeed: Diğer kullanıcıların gönderilerinin listelendiği akış.
 * 4. ActiveRooms: Aktif sohbet odalarının gösterildiği bölüm.
 * 
 * Ayrıca, kullanıcıyı karşılayan bir animasyon içerir.
 */
export default function HomePage() {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const username = user?.displayName?.split(" ")[0] || "Dostum";

  useEffect(() => {
    // Sayfa yüklendiğinde hoş geldin animasyonunu göster.
    // Animasyon 2 saniye sonra yavaşça kaybolmaya başlar ve 2.5 saniye sonunda DOM'dan kaldırılır.
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000); 

    const removeTimer = setTimeout(() => {
      setShowWelcome(false);
    }, 2500);

    // Bileşen DOM'dan kaldırıldığında zamanlayıcıları temizle
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
    };
  }, []); // Boş bağımlılık dizisi sayesinde bu efekt sadece bileşen ilk yüklendiğinde çalışır.

  return (
    <>
      {/* Hoş geldin animasyonu için tam ekran kaplama */}
      {showWelcome && (
        <div 
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-500",
            isFadingOut ? "opacity-0" : "opacity-100"
          )}
        >
          <h1 className="text-5xl font-bold tracking-tight text-primary animate-in zoom-in-95 duration-700">
            Hoş geldin, {username}!
          </h1>
        </div>
      )}

      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
          {/* Ana sayfanın dikey düzenini ve bileşenler arası boşluğu yöneten ana sarmalayıcı */}
          <div className="flex flex-col gap-8">
            {/* 1. Kullanıcıyı oda oluşturmaya teşvik eden kart */}
            <WelcomeCard />

            {/* 2. Yeni gönderi oluşturma alanı */}
            <NewPost />

            {/* 3. Gönderi akışı */}
            <PostsFeed />

            {/* 4. Aktif odalar listesi */}
            <ActiveRooms />
          </div>
        </main>
      </div>
    </>
  );
}
