// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, DocumentData, collection, query, where, getDocs, limit, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { startGameInRoom, submitAnswer, endGameWithoutWinner } from '@/lib/actions/gameActions';
import { joinVoiceChat } from '@/lib/actions/voiceActions'; // Sesli sohbet eylemi
import type { GameSettings, ActiveGame, Room, VoiceParticipant } from '@/lib/types';
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Loader2, Users, Gamepad2, Timer, Crown, ShieldCheck, Mic } from 'lucide-react';
import TextChat from '@/components/chat/text-chat';
import RoomGameCard from '@/components/game/RoomGameCard';
import GameCountdownCard from '@/components/game/GameCountdownCard';
import VoiceChatBar from '@/components/voice/VoiceChatBar'; // Sesli sohbet barı
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


/**
 * Oda Sohbet Sayfası
 * 
 * Bu sayfa, bir sohbet odasının ana görünümünü yönetir.
 * - Oda bilgilerini, katılımcıları, metin ve sesli sohbeti gösterir.
 * - Periyodik olarak Quiz Oyunu'nu başlatma ve yönetme mantığını içerir.
 * - Firestore'dan oda ve oyun verilerini anlık olarak dinler.
 */
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const roomId = params.id as string;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  // Oyun döngüsü için yeni state'ler
  const [gamePhase, setGamePhase] = useState<'idle' | 'countdown' | 'active'>('idle');
  const [countdown, setCountdown] = useState(20);
  const [nextGameCountdown, setNextGameCountdown] = useState<string>('');
  
  const gameStartAttempted = useRef(false);

  // Sesli sohbet için yeni state'ler
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);

  const isUserInVoiceChat = voiceParticipants.some(p => p.uid === user?.uid);
  const isHost = user?.uid === room?.createdBy.uid;

  // Helper to format time
  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Ayarları çek
  useEffect(() => {
    if (!roomId) return;
    const settingsUnsub = onSnapshot(doc(db, 'config', 'gameSettings'), (docSnap) => {
        if (docSnap.exists()) {
            setGameSettings(docSnap.data() as GameSettings);
        }
    });
    return () => { settingsUnsub(); };
  }, [roomId]);

  // Oda verisini ve oyun geri sayımını yönet
  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() } as Room);
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

    return () => roomUnsub();
  }, [roomId, router, toast]);

  // Aktif oyunu dinle
  useEffect(() => {
    if (!roomId) return;
    const gamesRef = collection(db, "rooms", roomId, "games");
    const q = query(gamesRef, where("status", "==", "active"), limit(1));
    const gameUnsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const gameData = snapshot.docs[0].data() as ActiveGame;
            gameData.id = snapshot.docs[0].id;
            setActiveGame(gameData);
            setGamePhase('active');
            gameStartAttempted.current = false; // Oyun başladığında denemeyi sıfırla
        } else {
            setActiveGame(null);
            if (gamePhase === 'active') { // Eğer oyun yeni bittiyse idle'a dön
                 setGamePhase('idle');
            }
        }
    });
    return () => gameUnsub();
  }, [roomId, gamePhase]);

   // Geri sayım ve oyun başlatma mantığı
    useEffect(() => {
        if (!room?.nextGameTimestamp) return;

        const timerId = setInterval(async () => {
            const remaining = room.nextGameTimestamp.toMillis() - Date.now();
            
            if(activeGame) {
                setGamePhase('active');
                setNextGameCountdown('');
            } else if (remaining > 20000) {
                setGamePhase('idle');
                setNextGameCountdown(formatTime(remaining));
            } else if (remaining > 0 && remaining <= 20000) {
                setGamePhase('countdown');
                setCountdown(Math.ceil(remaining / 1000));
            } else { // Süre doldu
                setGamePhase('idle');
                setNextGameCountdown('');
                if (!gameStartAttempted.current) {
                    gameStartAttempted.current = true;
                    await startGameInRoom(roomId);
                }
            }
        }, 1000);

        return () => clearInterval(timerId);
    }, [room, activeGame, roomId]);

   // Sesli sohbet katılımcılarını dinle
  useEffect(() => {
    if (!roomId) return;
    const voiceParticipantsRef = collection(db, "rooms", roomId, "voiceParticipants");
    const q = query(voiceParticipantsRef, orderBy("joinedAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const participants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
        setVoiceParticipants(participants);
    }, (error) => {
        console.error("Sesli sohbet katılımcıları alınırken hata:", error);
    });

    return () => unsubscribe();
  }, [roomId]);


  // Kullanıcının cevabını işleyen fonksiyon
  const handleAnswerSubmit = async (answerIndex: number) => {
    if (!user || !activeGame) return;
    try {
        await submitAnswer(roomId, activeGame.id, user.uid, answerIndex);
    } catch (error: any) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  // Oyun süresi dolduğunda tetiklenir
  const handleTimerEnd = () => {
      if (activeGame) {
          endGameWithoutWinner(roomId, activeGame.id);
      }
  };

  // Sesli sohbete katılma fonksiyonu
  const handleJoinVoice = async () => {
    if (!user || !room) return;
    setIsJoiningVoice(true);
    try {
      const result = await joinVoiceChat(roomId, {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
      });
      if (!result.success) {
        toast({ title: "Katılım Başarısız", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsJoiningVoice(false);
    }
  };


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
      <header className="flex flex-col p-4 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className='flex items-center justify-between'>
            <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="mr-2 rounded-full">
                <Link href="/rooms">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
            </Button>
            <div>
                <h1 className="text-lg font-bold">{room.name}</h1>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Oluşturan:</span>
                    <span className="font-semibold text-foreground">{room.createdBy.username}</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Crown className="h-4 w-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent><p>Oda Kurucusu</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {room.createdBy.role === 'admin' && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent><p>Yönetici</p></TooltipContent>
                            </Tooltip>
                        </Tooltip>
                    )}
                </div>
            </div>
            </div>
            <div className="flex items-center gap-4">
                {gamePhase === 'active' && <Gamepad2 className="h-5 w-5 text-primary animate-pulse" />}
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-5 w-5" />
                    <span className="font-semibold">{room.participants?.length || 0} / {room.maxParticipants || 7}</span>
                </div>
            </div>
        </div>
      </header>
      
      {/* Oyun ve Sohbet Alanı */}
      <main className="flex-1 overflow-y-auto relative" style={{ paddingBottom: isUserInVoiceChat ? '80px' : '0' }}>
         {/* Oyun Alanı */}
         <div className="sticky top-0 z-10 p-4 border-b bg-muted/20 backdrop-blur-sm">
            {gamePhase === 'idle' && nextGameCountdown && (
                 <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary animate-pulse">
                    <Timer className="h-5 w-5" />
                    <span>Yeni Oyun: {nextGameCountdown}</span>
                </div>
            )}
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
            {/* Sesli Sohbete Katıl Butonu */}
            {!isUserInVoiceChat && isParticipant && (
                 <div className="mt-4 flex justify-center">
                    <Button onClick={handleJoinVoice} disabled={isJoiningVoice || (room.voiceParticipantsCount || 0) >= 8}>
                        {isJoiningVoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                        { (room.voiceParticipantsCount || 0) >= 8 ? "Sesli Sohbet Dolu" : "Sesli Sohbete Katıl" }
                    </Button>
                </div>
            )}
         </div>

        <TextChat 
            roomId={roomId} 
            canSendMessage={isParticipant || false}
        />
      </main>
      
      {/* Sesli Sohbet Barı */}
      {isUserInVoiceChat && (
        <VoiceChatBar roomId={roomId} isHost={isHost} />
      )}
    </div>
  );
}
