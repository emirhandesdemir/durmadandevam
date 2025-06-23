
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Loader2 } from 'lucide-react';
import VoiceChatPanel from '@/components/rooms/voice-chat-panel';
import TextChat from '@/components/rooms/text-chat';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  
  const [room, setRoom] = useState<DocumentData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
    });

    return () => authUnsubscribe();
  }, [router]);

  useEffect(() => {
    if (!roomId) return;

    const docRef = doc(db, 'rooms', roomId);
    const roomUnsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("No such document!");
        setRoom(null);
      }
      setLoading(false);
    });

    return () => roomUnsubscribe();
  }, [roomId]);

  if (loading || !user) {
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
      <header className="flex items-center p-4 border-b">
        <Button asChild variant="ghost" size="icon" className="mr-2">
            <Link href="/home">
                <ChevronLeft className="h-5 w-5" />
            </Link>
        </Button>
        <div>
            <h1 className="text-lg font-bold">{room.name}</h1>
            <p className="text-sm text-muted-foreground">{room.topic}</p>
        </div>
      </header>
      
      <main className="flex-1 grid md:grid-cols-3 gap-4 p-4 overflow-y-auto">
        <div className="md:col-span-2 flex flex-col gap-4">
            <TextChat roomId={roomId} currentUser={user} />
        </div>
        <div className="md:col-span-1">
            <VoiceChatPanel currentUser={user} />
        </div>
      </main>
    </div>
  );
}
