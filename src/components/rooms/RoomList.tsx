"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import RoomCard, { type Room } from "./RoomCard";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Firestore'dan gelen oda verilerini dinler ve RoomCard bileşenleri ile listeler.
 */
export default function RoomList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sadece giriş yapmış kullanıcılar odaları görebilir
    if (user) {
      const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
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
      // Bileşen kaldırıldığında dinleyiciyi temizle
      return () => unsubscribe();
    } else {
        setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="sr-only">Odalar yükleniyor...</p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <Card className="text-center p-8 border-dashed">
        <CardContent className="p-0">
          <h3 className="text-lg font-semibold">Henüz Hiç Oda Yok!</h3>
          <p className="text-muted-foreground mt-2">İlk odayı sen oluşturarak sohbeti başlatabilirsin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
