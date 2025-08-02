// src/app/(main)/rooms/page.tsx
'use client';

import { useState } from "react";
import CreateRoomCard from "@/components/rooms/CreateRoomCard";
import RoomList from "@/components/rooms/RoomList";
import { Input } from "@/components/ui/input";
import { Search, Swords, PlusCircle } from "lucide-react";
import LeadershipBoard from "@/components/rooms/LeadershipBoard";
import { cn } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Odalar Sayfası
 * 
 * Kullanıcıların yeni oda oluşturabileceği, mevcut odaları listeleyebileceği,
 * arayabileceği ve en popüler odaları (liderlik tablosu) görebileceği ana sayfadır.
 */
export default function RoomsPage() {
  // Oda listesini filtrelemek için kullanılan arama terimini tutan state.
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className={cn("min-h-screen text-foreground rooms-page-bg")}>
      <main className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-6">

          {/* Arama ve Başlık */}
           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h1 className="text-3xl font-bold tracking-tight">Sohbet Odaları</h1>
              <div className="relative flex-1 md:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Oda ara..."
                      className="pl-10 rounded-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
            </div>

          {/* Yeni oda oluşturma veya mevcut odayı yönetme kartı. */}
          <CreateRoomCard />

          {/* En popüler odaları gösteren liderlik tablosu. */}
          <LeadershipBoard />
          
          <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight">Aktif Odalar</h2>
               <Button asChild variant="ghost">
                 <Link href="/create-room">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Oda
                 </Link>
               </Button>
            </div>

          {/* Aktif odaları listeleyen bileşen. Arama terimini prop olarak alır. */}
          <RoomList searchTerm={searchTerm} />
        </div>
      </main>
    </div>
  );
}
