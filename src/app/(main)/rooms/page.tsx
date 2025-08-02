// src/app/(main)/rooms/page.tsx
'use client';

import { useState } from "react";
import CreateRoomCard from "@/components/rooms/CreateRoomCard";
import RoomList from "@/components/rooms/RoomList";
import { Input } from "@/components/ui/input";
import { Search, Swords, PlusCircle, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Odalar Sayfası
 * 
 * Kullanıcıların yeni oda oluşturabileceği, mevcut odaları listeleyebileceği,
 * arayabileceği ve en popüler odaları (liderlik tablosu) görebileceği ana sayfadır.
 */
export default function RoomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isJoiningRandom, setIsJoiningRandom] = useState(false);


  return (
    <div className="min-h-screen text-foreground rooms-page-bg">
      <main className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-6">

          {/* Başlık ve Hızlı Eylemler */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Sohbet Odaları</h1>
            <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <Link href="/matchmaking">
                    <Swords className="mr-2 h-4 w-4" /> Hızlı Sohbet
                  </Link>
                </Button>
            </div>
          </div>
          
          {/* Arama ve Yeni Oda Butonu */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1 md:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Oda ara..."
                      className="pl-10 rounded-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
               <Button asChild>
                 <Link href="/create-room">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Oda Oluştur
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
