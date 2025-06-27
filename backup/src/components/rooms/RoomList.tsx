// src/components/rooms/RoomList.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import RoomCard from "./RoomCard";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Oda Listesi (RoomList)
 * 
 * Firestore'dan gelen oda verilerini gerçek zamanlı olarak dinler ve
 * her bir oda için bir RoomCard bileşeni oluşturarak listeler.
 * - Veri yüklenirken bir yükleme animasyonu gösterir.
 * - Hiç oda yoksa bilgilendirici bir mesaj gösterir.
 * - Mobil uyumlu bir grid yapısı kullanır.
 */
export default function RoomList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sadece giriş yapmış kullanıcılar odaları görebilir
    if (user) {
      // 'rooms' koleksiyonuna sorgu oluştur, en yeni odalar üstte olacak şekilde sırala
      const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
      
      // onSnapshot ile koleksiyondaki değişiklikleri gerçek zamanlı olarak dinle
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const roomsData: Room[] = [];
        querySnapshot.forEach((doc) => {
          roomsData.push({ id: doc.id, ...doc.data() } as Room);
        });
        setRooms(roomsData);
        setLoading(false);
      }, (error) => {
        console.error("Oda verisi alınırken hata:", error);
        setLoading(false);
      });

      // Bileşen DOM'dan kaldırıldığında (unmount) dinleyiciyi temizle
      return () => unsubscribe();
    } else {
        // Kullanıcı giriş yapmamışsa yüklemeyi bitir
        setLoading(false);
    }
  }, [user]); // user değiştiğinde (giriş/çıkış) efekti yeniden çalıştır

  // Yükleme durumu
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="sr-only">Odalar yükleniyor...</p>
      </div>
    );
  }

  // Hiç oda yoksa veya kullanıcı giriş yapmamışsa
  if (rooms.length === 0) {
    return (
      <Card className="text-center p-8 border-dashed rounded-3xl bg-card/50">
        <CardContent className="p-0">
          <h3 className="text-lg font-semibold">Henüz Hiç Oda Yok!</h3>
          <p className="text-muted-foreground mt-2">İlk odayı sen oluşturarak sohbeti başlatabilirsin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    // Odaları mobil uyumlu grid yapısında göster
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
