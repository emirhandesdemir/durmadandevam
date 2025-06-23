"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PostCard from "@/components/feed/post-card";
import { Loader2, PenSquare, RadioTower } from "lucide-react";

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const roomsData: Room[] = [];
        querySnapshot.forEach((doc) => {
          roomsData.push({ id: doc.id, ...doc.data() } as Room);
        });
        setRooms(roomsData);
      });
      return () => unsubscribe();
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">HiweWalk</h1>
      </header>

      <Card className="bg-gradient-to-br from-purple-600 via-red-500 to-yellow-500 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
                <RadioTower className="h-6 w-6 text-white"/>
            </div>
            <div>
              <h2 className="text-xl font-bold">Merhaba, {user.displayName || "Kullanıcı"}!</h2>
              <p className="text-sm opacity-90">Topluluğa hoş geldin. Yeni keşifler seni bekliyor!</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Link href="/create-room">
        <Card className="hover:bg-accent transition-colors">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Avatar>
                          <AvatarImage src={user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} />
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
        {rooms.map((room) => (
          <PostCard key={room.id} room={room} currentUser={user} />
        ))}
      </div>
    </div>
  );
}
