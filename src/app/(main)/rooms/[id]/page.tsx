// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, DocumentData, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { startGameInRoom } from '@/lib/actions/gameActions';
import type { GameSettings, ActiveGame } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, Users, Gamepad2 } from 'lucide-react';
import TextChat from '@/components/chat/text-chat';
import RoomGameCard from '@/components/game/RoomGameCard';

/**
 * Oda Sohbet Sayfası
 * 
 * Bu sayfa, bir sohbet odasının ana görünümünü yönetir.
 * - Oda bilgilerini, katılımcıları ve sohbeti gösterir.
 * - Periyodik olarak Quiz Oyunu'nu başlatma ve yönetme mantığını içerir.
 * - Firestore'dan oda ve oyun verilerini anlık olarak dinler.
 */
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const roomId = params.id as string;
  
  const [room, setRoom] = useState<DocumentData | null>(null);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Oyun başlatma fonksiyonu (useCallback ile memoize edildi)
  const triggerGameStart = useCallback(async () => {
    if (!roomId || !gameSettings) return;

    // Mevcut aktif bir oyun var mı kontrol et
    const gamesRef = collection(db, "rooms", roomId, "games");
    const q = query(gamesRef, where("status", "==", "active"), limit(1));
    const activeGameSnapshot = await getDocs(q);

    if (activeGameSnapshot.empty) {
      console.log("Yeni oyun başlatılıyor...");
      await startGameInRoom(roomId);
    } else {
      console.log("Zaten aktif bir oyun var.");
    }
  }, [roomId, gameSettings]);

  // Ayarları ve oda verilerini çek
  useEffect(() => {
    if (!roomId) return;

    // Oyun ayarlarını çek
    const settingsUnsub = onSnapshot(doc(db, 'config', 'gameSettings'), (docSnap) => {
        if (docSnap.exists()) {
            setGameSettings(docSnap.data() as GameSettings);
        }
    });

    // Oda verilerini dinle
    const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast({ title: "Hata", description: "Oda bulunamadı veya silinmiş.", variant: "destructive" });
        router.push('/rooms');
        setRoom(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Oda verisi alınırken hata:", error);
      toast({ title: "Hata", description: "Odaya erişilirken bir sorun oluştu.", variant: "destructive" });
      setLoading(false);
    });

    return () => {
      settingsUnsub();
      roomUnsub();
    };
  }, [roomId, router, toast]);

  // Aktif oyunu dinle
  useEffect(() => {
    if (!roomId) return;
    const gamesRef = collection(db, "rooms", roomId, "games");
    const q = query(gamesRef, orderBy("startTime", "desc"), limit(1));
    
    const gameUnsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const gameData = snapshot.docs[0].data() as ActiveGame;
            gameData.id = snapshot.docs[0].id;
            // Sadece aktif oyunları state'e ata
            if (gameData.status === 'active') {
                setActiveGame(gameData);
            } else {
                setActiveGame(null); // Oyun bittiyse state'i temizle
            }
        } else {
            setActiveGame(null);
        }
    });

    return () => gameUnsub();
  }, [roomId]);


  // Periyodik oyun başlatma döngüsü
  useEffect(() => {
    // Önceki interval'i temizle
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
    }
    // Ayarlar yüklendiyse yeni interval kur
    if (gameSettings && gameSettings.gameIntervalMinutes > 0) {
      // İlk oyunu hemen başlat
      triggerGameStart();
      // Ardından periyodik olarak devam et
      const intervalMs = gameSettings.gameIntervalMinutes * 60 * 1000;
      gameIntervalRef.current = setInterval(triggerGameStart, intervalMs);
    }
    // Component unmount olduğunda interval'i temizle
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, [gameSettings, triggerGameStart]);


  // Yükleme durumu
  if (loading || authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Oda bulunamadıysa
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

  const isParticipant = room.participants?.some((p: any) => p.uid === user.uid);

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
        <div className="flex items-center gap-4">
            {activeGame && <Gamepad2 className="h-5 w-5 text-primary animate-pulse" />}
            <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span className="font-semibold">{room.participants?.length || 0} / {room.maxParticipants || 7}</span>
            </div>
        </div>
      </header>
      
      {/* Oyun ve Sohbet Alanı */}
      <main className="flex-1 overflow-y-auto relative">
         {/* Oyun Kartı Alanı */}
         {activeGame && gameSettings && (
            <div className="sticky top-0 z-10 p-4 border-b bg-card">
                <RoomGameCard 
                    game={activeGame} 
                    roomId={roomId} 
                    settings={gameSettings}
                />
            </div>
         )}
        <TextChat 
            roomId={roomId} 
            canSendMessage={isParticipant || false}
            gameId={activeGame?.id || null} 
        />
      </main>
    </div>
  );
}
