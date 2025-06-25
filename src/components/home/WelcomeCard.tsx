// src/components/home/WelcomeCard.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PlusCircle, Compass } from "lucide-react";

/**
 * WelcomeCard Bileşeni
 * 
 * Ana sayfanın en üstünde yer alan ve giriş yapmış kullanıcıyı karşılayan karttır.
 * Kullanıcının adını gösterir ve iki ana eylem butonu içerir:
 * - Oda Oluştur: Kullanıcıyı yeni bir sohbet odası oluşturma sayfasına yönlendirir.
 * - Odaları Keşfet: Kullanıcıyı mevcut odaları listeleyeceği bir sayfaya yönlendirir. (Gelecek özellik)
 * 
 * Stil: Canlı bir gradyan arka plan, yuvarlak köşeler ve yumuşak gölgelerle modern bir görünüm sunar.
 */
export default function WelcomeCard() {
  // AuthContext'ten mevcut kullanıcı bilgilerini alır.
  const { user } = useAuth();
  const username = user?.displayName?.split(" ")[0] || "Dostum";

  return (
    <div className="rounded-3xl bg-gradient-to-br from-primary via-fuchsia-500 to-accent p-8 text-primary-foreground shadow-2xl shadow-primary/20">
      <div className="flex flex-col items-start gap-4">
        {/* Kullanıcıyı karşılayan başlık */}
        <h1 className="text-4xl font-bold tracking-tight">
          Hoş geldin, {username}!
        </h1>
        <p className="max-w-md text-lg text-primary-foreground/90">
          Bugün yeni maceralara atılmaya hazır mısın?
        </p>
        
        {/* Eylem butonlarını içeren sarmalayıcı */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-white px-8 py-6 text-lg font-semibold text-primary shadow-lg transition-transform hover:scale-105 hover:bg-white/90 active:scale-95"
          >
            <Link href="/create-room">
              <PlusCircle className="mr-2 h-5 w-5" />
              Oda Oluştur
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-2 border-white/50 bg-white/20 px-8 py-6 text-lg font-semibold text-white backdrop-blur-sm transition-transform hover:scale-105 hover:bg-white/30 active:scale-95"
          >
            {/* Henüz bu sayfa oluşturulmadığı için anasayfaya yönlendiriyor */}
            <Link href="/home">
              <Compass className="mr-2 h-5 w-5" />
              Odaları Keşfet
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
