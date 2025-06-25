// src/components/home/WelcomeCard.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

/**
 * WelcomeCard Bileşeni
 * 
 * Ana sayfanın en üstünde yer alan ve kullanıcıyı yeni bir oda oluşturmaya
 * teşvik eden karttır.
 * 
 * Stil: Canlı bir gradyan arka plan, yuvarlak köşeler ve yumuşak gölgelerle modern bir görünüm sunar.
 */
export default function WelcomeCard() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-primary via-fuchsia-500 to-accent p-8 text-primary-foreground shadow-2xl shadow-primary/20">
      <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        {/* Kullanıcıyı eyleme çağıran metin */}
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
                Yeni Bir Maceraya Başla!
            </h1>
            <p className="text-primary-foreground/90">
                Kendi sohbet odanı oluştur ve insanları bir araya getir.
            </p>
        </div>
        
        {/* Eylem butonu */}
        <div className="mt-4 flex-shrink-0 md:mt-0">
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
        </div>
      </div>
    </div>
  );
}
