// src/app/(main)/rooms/page.tsx
'use client';

import { useState } from "react";
import CreateRoomCard from "@/components/rooms/CreateRoomCard";
import RoomList from "@/components/rooms/RoomList";
import { Input } from "@/components/ui/input";
import { Search, Swords } from "lucide-react";
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
    <div className={cn("min-h-screen bg-background text-foreground")}>
      <main className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-8">
          {/* Yeni oda oluşturma veya mevcut odayı yönetme kartı. */}
          <CreateRoomCard />

          {/* En popüler odaları gösteren liderlik tablosu. */}
          <LeadershipBoard />

          <Link href="/matchmaking">
            <Card className="bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between p-6">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Swords /> Hızlı Sohbet
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    Yeni insanlarla tanışmak için 4 dakikalık sürpriz bir sohbete başla!
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="bg-white/20 hover:bg-white/30 rounded-full h-12 w-12">
                    <ChevronRight className="h-6 w-6"/>
                </Button>
              </CardHeader>
            </Card>
          </Link>
          
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
