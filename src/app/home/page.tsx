"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PostCard from "@/components/feed/post-card";
import { Loader2, Settings, Bell, Gem, Compass, PlusCircle, PenSquare, RadioTower } from "lucide-react";

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
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">HiweWalk</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Welcome Card */}
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
      
      {/* Diamonds and Actions */}
      <Card>
        <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-yellow-400" />
                <span className="font-semibold">Elmasların: 30</span>
            </div>
            <div className="flex gap-2">
                <Button className="w-full">
                    <Compass className="mr-2"/> Odaları Keşfet
                </Button>
                 <Button variant="secondary" className="w-full" asChild>
                    <Link href="/create-room">
                        <PlusCircle className="mr-2"/> Yeni Oda Oluştur
                    </Link>
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* Share something */}
      <Link href="/create-room">
        <Card className="hover:bg-accent transition-colors">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Avatar>
                          <AvatarImage src={user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} />
                          <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Bir şeyler paylaş, {user.displayName || "Kullanıcı"}...</span>
                   </div>
                   <PenSquare className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
        </Card>
      </Link>


      {/* Feed */}
      <div className="flex flex-col gap-3">
        {rooms.map((room) => (
          <PostCard key={room.id} room={room} currentUser={user} />
        ))}
      </div>
    </div>
  );
}
