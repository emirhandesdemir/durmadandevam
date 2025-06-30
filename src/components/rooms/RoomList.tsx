// src/components/rooms/RoomList.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import RoomListItem from "./RoomListItem";
import { type Room } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shuffle } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { joinRoom } from "@/lib/actions/roomActions";

interface RoomListProps {
  searchTerm: string;
}

export default function RoomList({ searchTerm }: RoomListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoiningRandom, setIsJoiningRandom] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
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
    return () => unsubscribe();
  }, [user]);

  const filteredRooms = rooms
    .filter(room => !room.expiresAt || (room.expiresAt as Timestamp).toDate() > new Date())
    .filter(room => room.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRandomJoin = async () => {
    if (!user) return;
    setIsJoiningRandom(true);
    const availableRooms = rooms.filter(r => {
        const isExpired = r.expiresAt && (r.expiresAt as Timestamp).toDate() < new Date();
        const isFull = (r.participants?.length || 0) >= r.maxParticipants;
        const isParticipant = r.participants?.some(p => p.uid === user.uid);
        return !isExpired && !isFull && !isParticipant;
    });

    if (availableRooms.length === 0) {
        toast({
            variant: "destructive",
            description: "Katılabileceğin uygun bir oda bulunamadı.",
        });
        setIsJoiningRandom(false);
        return;
    }

    const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    
    try {
        await joinRoom(randomRoom.id, {
            uid: user.uid,
            username: user.displayName,
            photoURL: user.photoURL,
        });
        toast({ description: `"${randomRoom.name}" odasına katıldın!` });
        router.push(`/rooms/${randomRoom.id}`);
    } catch (error: any) {
        toast({ variant: 'destructive', description: `Odaya katılırken bir hata oluştu: ${error.message}` });
    } finally {
        setIsJoiningRandom(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

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
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button variant="outline" onClick={handleRandomJoin} disabled={isJoiningRandom}>
                {isJoiningRandom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
                Rastgele Katıl
            </Button>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                    <RoomListItem key={room.id} room={room} />
                ))
            ) : (
                <p className="text-center text-muted-foreground py-8 col-span-full">
                    Aradığın kriterlere uygun oda bulunamadı.
                </p>
            )}
        </div>
    </div>
  );
}
