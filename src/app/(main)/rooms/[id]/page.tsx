"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, DocumentData, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, Users } from 'lucide-react';
import TextChat from '@/components/chat/text-chat';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const roomId = params.id as string;
  
  const [room, setRoom] = useState<DocumentData | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!roomId) return;

    const docRef = doc(db, 'rooms', roomId);
    const roomUnsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast({
          title: "Hata",
          description: "Oda bulunamadı veya silinmiş.",
          variant: "destructive",
        });
        router.push('/home');
        setRoom(null);
      }
      setRoomLoading(false);
    }, (error) => {
      console.error("Error fetching room:", error);
      toast({
        title: "Hata",
        description: "Odaya erişilirken bir sorun oluştu.",
        variant: "destructive"
      });
      setRoomLoading(false);
    });

    return () => roomUnsubscribe();
  }, [roomId, router, toast]);

  const isParticipant = room?.participants?.some((p: any) => p.uid === user?.uid);

  if (authLoading || roomLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
     return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4 p-4">
         <h2 className="text-2xl font-bold">Oda Bulunamadı</h2>
         <p className="text-muted-foreground">Aradığınız oda mevcut değil veya silinmiş olabilir.</p>
         <Button asChild>
            <Link href="/home">Ana Sayfaya Dön</Link>
         </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="mr-2">
              <Link href="/home">
                  <ChevronLeft className="h-5 w-5" />
              </Link>
          </Button>
          <div>
              <h1 className="text-lg font-bold">{room.name}</h1>
              <p className="text-sm text-muted-foreground">{room.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span className="font-semibold">{room.participants?.length || 0} / {room.maxParticipants || 7}</span>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 bg-muted/20">
        <TextChat roomId={roomId} canSendMessage={isParticipant} />
      </main>
    </div>
  );
}
