// src/app/(main)/rooms/page.tsx
'use client';

import { useState } from "react";
import CreateRoomCard from "@/components/rooms/CreateRoomCard";
import RoomList from "@/components/rooms/RoomList";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import LeadershipBoard from "@/components/rooms/LeadershipBoard";
import { cn } from "@/lib/utils";

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
    <div className={cn("min-h-screen bg-background text-foreground")}>
      <main className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-8">
          {/* Yeni oda oluşturma veya mevcut odayı yönetme kartı. */}
          <CreateRoomCard />

          {/* En popüler odaları gösteren liderlik tablosu. */}
          <LeadershipBoard />
          
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight">Aktif Sohbet Odaları</h2>
              {/* Arama Kutusu */}
              <div className="relative flex-1 md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Oda veya konu ara..."
                      className="pl-9 rounded-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
            </div>
          </div>

          {/* Aktif odaları listeleyen bileşen. Arama terimini prop olarak alır. */}
          <RoomList searchTerm={searchTerm} />
        </div>
      </main>
    </div>
  );
}
