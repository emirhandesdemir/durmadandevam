// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, Users } from 'lucide-react';
import TextChat from '@/components/chat/text-chat';

/**
 * Oda Sohbet Sayfası
 * 
 * Kullanıcı bir odaya katıldığında bu sayfa açılır.
 * - Odanın başlık bilgilerini (ad, katılımcı sayısı) gösterir.
 * - Gerçek zamanlı metin sohbeti bileşenini (TextChat) içerir.
 * - Firestore'dan oda verilerini anlık olarak dinler ve oda bulunamazsa kullanıcıyı ana sayfaya yönlendirir.
 */
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const roomId = params.id as string;
  
  const [room, setRoom] = useState<DocumentData | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Firestore'dan odayı dinle
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
        router.push('/rooms'); // Odalar sayfasına yönlendir
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

    // Component unmount olduğunda dinleyiciyi kapat
    return () => roomUnsubscribe();
  }, [roomId, router, toast]);

  // Mevcut kullanıcının bu odanın bir katılımcısı olup olmadığını kontrol et
  const isParticipant = room?.participants?.some((p: any) => p.uid === user?.uid);

  // Yükleme durumları
  if (authLoading || roomLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Oda bulunamadıysa gösterilecek ekran
  if (!room) {
     return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4 p-4 bg-background">
         <h2 className="text-2xl font-bold">Oda Bulunamadı</h2>
         <p className="text-muted-foreground">Aradığınız oda mevcut değil veya silinmiş olabilir.</p>
         <Button asChild>
            <Link href="/rooms">Odalar Sayfasına Dön</Link>
         </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Üst Bilgi (Header) */}
      <header className="flex items-center justify-between p-4 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="mr-2 rounded-full">
              <Link href="/rooms">
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
      
      {/* Sohbet Alanı */}
      <main className="flex-1 overflow-y-auto">
        <TextChat roomId={roomId} canSendMessage={isParticipant || false} />
      </main>
    </div>
  );
}
