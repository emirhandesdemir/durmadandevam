"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PostCard from "@/components/feed/post-card";
import { Loader2, PenSquare, Users } from "lucide-react";

export interface Room {
    id: string;
    name: string;
    topic: string;
    creatorName: string;
    createdBy: string;
    createdAt: Timestamp;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

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

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">HiweWalk</h1>
        </div>
      </header>

      <Link href="/create-room">
        <Card className="hover:bg-accent/20 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Avatar>
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Yeni bir oda oluştur...</span>
                   </div>
                   <PenSquare className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
        </Card>
      </Link>

      <div className="flex flex-col gap-3">
        {roomsLoading ? (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : rooms.length === 0 ? (
            <Card className="text-center p-8">
                <CardContent className="p-0">
                    <p className="text-muted-foreground">Henüz hiç oda oluşturulmamış.</p>
                    <p className="text-muted-foreground">İlk odayı sen oluştur!</p>
                </CardContent>
            </Card>
        ) : (
            rooms.map((room) => (
              <PostCard key={room.id} room={room} />
            ))
        )}
      </div>
    </div>
  );
}
