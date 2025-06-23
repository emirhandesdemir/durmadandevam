"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Room } from "@/components/feed/post-card";
import PostCard from "@/components/feed/post-card";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function RoomList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const roomsData: Room[] = [];
        querySnapshot.forEach((doc) => {
          roomsData.push({ id: doc.id, ...doc.data() } as Room);
        });
        setRooms(roomsData);
        setRoomsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  if (roomsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardContent className="p-0">
          <p className="text-muted-foreground">Henüz hiç oda oluşturulmamış.</p>
          <p className="text-muted-foreground">İlk odayı sen oluştur!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rooms.map((room) => (
        <PostCard key={room.id} room={room} />
      ))}
    </div>
  );
}
