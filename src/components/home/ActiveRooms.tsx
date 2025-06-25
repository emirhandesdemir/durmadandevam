// src/components/home/ActiveRooms.tsx
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import Link from "next/link";

// Gerçek bir uygulamada bu veriler API'den veya Firestore'dan gelecektir.
// Bu kısım şimdilik temsili (dummy) verilerle doldurulmuştur.
const rooms = [
  {
    id: "room1",
    name: "Haftasonu Oyuncuları",
    description: "Co-op oyunlar ve sohbet için.",
    participants: 5,
    maxParticipants: 7,
    bgColor: "from-sky-400 to-blue-600",
  },
  {
    id: "room2",
    name: "Kitap Kulübü",
    description: "Bu ayın kitabı: Dune.",
    participants: 7,
    maxParticipants: 7,
    bgColor: "from-purple-500 to-indigo-600",
  },
  {
    id: "room3",
    name: "Müzik Kaşifleri",
    description: "Yeni sanatçılar keşfedin.",
    participants: 3,
    maxParticipants: 7,
    bgColor: "from-emerald-400 to-teal-600",
  },
];

/**
 * ActiveRooms Bileşeni
 * 
 * Ana sayfanın alt kısmında aktif olan sohbet odalarından birkaçını gösteren bölümdür.
 * - Yatayda kaydırılabilir bir liste olarak tasarlanmıştır (mobil için dikey).
 * - Her oda kartı, odanın adını, katılımcı sayısını ve kısa bir açıklamasını içerir.
 * - "Katıl" butonu ile kullanıcıyı ilgili odaya yönlendirir.
 */
export default function ActiveRooms() {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Aktif Odalar</h2>
        <Button variant="link" asChild>
          <Link href="/home">Tümünü Gör <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
      
      {/* Odaların listelendiği grid yapısı */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rooms.slice(0, 3).map((room) => (
          <Card
            key={room.id}
            className={`flex flex-col justify-between overflow-hidden rounded-3xl text-white shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl ${room.bgColor}`}
          >
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{room.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="opacity-90">{room.description}</p>
            </CardContent>
            <CardFooter className="flex items-center justify-between bg-black/20 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold">
                  {room.participants}/{room.maxParticipants}
                </span>
              </div>
              <Button
                variant="secondary"
                className="rounded-full bg-white text-black transition-colors hover:bg-gray-200"
                disabled={room.participants >= room.maxParticipants}
              >
                {room.participants >= room.maxParticipants ? "Dolu" : "Katıl"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
