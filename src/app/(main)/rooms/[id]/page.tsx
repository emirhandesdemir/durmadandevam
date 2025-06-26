// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, DocumentData, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { startGameInRoom, submitAnswer, endGameWithoutWinner } from '@/lib/actions/gameActions';
import type { GameSettings, ActiveGame } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, Users, Gamepad2 } from 'lucide-react';
import TextChat from '@/components/chat/text-chat';
import RoomGameCard from '@/components/game/RoomGameCard';
import GameCountdownCard from '@/components/game/GameCountdownCard';


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

  // Oyun döngüsü için yeni state'ler
  const [gamePhase, setGamePhase] = useState<'idle' | 'countdown' | 'active' | 'cooldown'>('idle');
  const [countdown, setCountdown] = useState(20); // 20 saniye geri sayım
  const gameLoopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ayarları ve oda verilerini çek
  useEffect(() => {
    if (!roomId) return;
    const settingsUnsub = onSnapshot(doc(db, 'config', 'gameSettings'), (docSnap) => {
        if (docSnap.exists()) {
            setGameSettings(docSnap.data() as GameSettings);
        }
    });
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
    return () => { settingsUnsub(); roomUnsub(); };
  }, [roomId, router, toast]);

  // Aktif oyunu dinle
  useEffect(() => {
    if (!roomId) return;
    const gamesRef = collection(db, "rooms", roomId, "games");
    const q = query(gamesRef, where("status", "==", "active"), orderBy("startTime", "desc"), limit(1));
    const gameUnsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const gameData = snapshot.docs[0].data() as ActiveGame;
            gameData.id = snapshot.docs[0].id;
            setActiveGame(gameData);
            setGamePhase('active');
        } else {
            // Aktif oyun yoksa ve mevcut durum 'active' ise, cooldown'a geç
            if (gamePhase === 'active') {
                setGamePhase('cooldown');
            }
            setActiveGame(null);
        }
    });
    return () => gameUnsub();
  }, [roomId, gamePhase]);

  // Oyun döngüsünü yöneten ana useEffect
  useEffect(() => {
    // Zamanlayıcıyı her faz değişiminde temizle
    if (gameLoopTimerRef.current) clearTimeout(gameLoopTimerRef.current);

    if (!gameSettings || !room || (room.participants?.length || 0) < 1) {
        setGamePhase('idle'); // Yeterli katılımcı yoksa veya ayar yoksa bekle
        return;
    };
    
    if (gamePhase === 'idle') {
        // Bir sonraki oyun için bekleme süresi
        gameLoopTimerRef.current = setTimeout(() => {
            setGamePhase('countdown');
            setCountdown(20); // Geri sayımı başlat
        }, gameSettings.gameIntervalMinutes * 60 * 1000);

    } else if (gamePhase === 'countdown') {
        // Geri sayım
        if (countdown > 0) {
            gameLoopTimerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else {
            // Geri sayım bitti, oyunu başlat
            startGameInRoom(roomId);
            // Oyun başladığında snapshot listener 'active' faza geçirecek
        }
    } else if (gamePhase === 'cooldown') {
        // Oyun sonrası bekleme süresi
        gameLoopTimerRef.current = setTimeout(() => {
            setGamePhase('idle'); // Döngüyü yeniden başlat
        }, gameSettings.cooldownSeconds * 1000);
    }
    
    return () => {
        if (gameLoopTimerRef.current) clearTimeout(gameLoopTimerRef.current);
    };
  }, [gamePhase, gameSettings, room, roomId, countdown]);

  // Kullanıcının cevabını işleyen fonksiyon
  const handleAnswerSubmit = async (answerIndex: number) => {
    if (!user || !activeGame) return;
    try {
        await submitAnswer(roomId, activeGame.id, user.uid, answerIndex);
        // Başarılı cevap sonrası oyun durumu snapshot'tan güncellenecek
    } catch (error: any) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  // Oyun süresi dolduğunda tetiklenir
  const handleTimerEnd = () => {
      if (activeGame) {
          endGameWithoutWinner(roomId, activeGame.id);
      }
  }

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
      <header className="flex items-center justify-between p-4 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
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
            {gamePhase === 'active' && <Gamepad2 className="h-5 w-5 text-primary animate-pulse" />}
            <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span className="font-semibold">{room.participants?.length || 0} / {room.maxParticipants || 7}</span>
            </div>
        </div>
      </header>
      
      {/* Oyun ve Sohbet Alanı */}
      <main className="flex-1 overflow-y-auto relative">
         {/* Oyun Alanı */}
         <div className="sticky top-0 z-10 p-4 border-b bg-muted/20">
            {gamePhase === 'countdown' && (
                <GameCountdownCard timeLeft={countdown} />
            )}
            {gamePhase === 'active' && activeGame && gameSettings && (
                <RoomGameCard 
                    game={activeGame} 
                    settings={gameSettings}
                    onAnswerSubmit={handleAnswerSubmit}
                    onTimerEnd={handleTimerEnd}
                    currentUserId={user.uid}
                />
            )}
         </div>

        <TextChat 
            roomId={roomId} 
            canSendMessage={isParticipant || false}
        />
      </main>
    </div>
  );
}
