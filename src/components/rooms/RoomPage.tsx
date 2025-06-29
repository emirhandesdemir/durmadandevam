// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Loader2, Mic, PhoneOff, ScreenShare, ScreenShareOff, Gift, Hand, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TextChat from '@/components/chat/text-chat';
import ChatMessageInput from '@/components/chat/ChatMessageInput';
import VoiceUserIcon from '@/components/voice/VoiceUserIcon';
import ParticipantListSheet from '@/components/rooms/ParticipantListSheet';
import RoomHeader from '@/components/rooms/RoomHeader';
import ScreenShareView from '@/components/voice/ScreenShareView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// --- Game Imports ---
import type { Room, ActiveGame, GameSettings, Message } from '@/lib/types';
import GameCountdownCard from '@/components/game/GameCountdownCard';
import RoomGameCard from '@/components/game/RoomGameCard';
import { startGameInRoom, submitAnswer, endGameWithoutWinner, getGameSettings } from '@/lib/actions/gameActions';
import { requestToSpeak } from '@/lib/actions/roomActions';
import OpenPortalDialog from '@/components/rooms/OpenPortalDialog';
import GameLobbyDialog from '@/components/game/GameLobbyDialog';


export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    // --- Auth & Contexts ---
    const { user, loading: authLoading, featureFlags, userData } = useAuth();
    const { 
        self, isConnecting, isConnected, isSharingScreen, localScreenStream, remoteScreenStreams,
        startScreenShare, stopScreenShare, joinRoom, leaveRoom, toggleSelfMute,
        participants, setActiveRoomId,
    } = useVoiceChat();

    // --- Component State ---
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [isPortalDialogOpen, setIsPortalDialogOpen] = useState(false);
    const [isGameLobbyOpen, setIsGameLobbyOpen] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const [isRequestingSpeak, setIsRequestingSpeak] = useState(false);


    // --- Game State ---
    const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [gameLoading, setGameLoading] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);
    const activeGameRef = useRef(activeGame);

    useEffect(() => { activeGameRef.current = activeGame; }, [activeGame]);

    const isHost = user?.uid === room?.createdBy.uid;
    const isModerator = room?.moderators?.includes(user?.uid || '') || false;
    const canSpeak = !room?.requestToSpeakEnabled || self?.canSpeak || isModerator || isHost;
    const hasRequestedSpeak = room?.speakRequests?.includes(user?.uid || '');

    const screenSharer = participants.find(p => p.isSharingScreen);
    const remoteScreenStream = screenSharer && !isSharingScreen ? remoteScreenStreams[screenSharer.uid] : null;

    useEffect(() => {
        if (roomId) setActiveRoomId(roomId);
        return () => setActiveRoomId(null);
    }, [roomId, setActiveRoomId]);

    useEffect(() => { getGameSettings().then(setGameSettings); }, []);

    useEffect(() => {
        if (!roomId) return;
        
        const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists()) {
                 const roomData = { id: docSnap.id, ...docSnap.data() } as Room;
                 setRoom(roomData);
            } else {
                 toast({ variant: 'destructive', title: 'Oda Bulunamadı', description: 'Bu oda artık mevcut değil veya süresi dolmuş.' });
                 router.push('/rooms');
            }
        });

        const messagesQuery = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"), limit(100));
        const messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            setMessagesLoading(false);
        });
        
        return () => { roomUnsub(); messagesUnsub(); };
    }, [roomId, router, toast]);
    
    useEffect(() => {
        if (!roomId || !featureFlags?.quizGameEnabled) { setGameLoading(false); return; }
        setGameLoading(true);
        const gamesQuery = query(collection(db, `rooms/${roomId}/games`), where("status", "==", "active"), limit(1));
        const gameUnsub = onSnapshot(gamesQuery, (snapshot) => {
            if (!snapshot.empty) {
                const gameData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ActiveGame;
                if (JSON.stringify(gameData) !== JSON.stringify(activeGameRef.current)) { setActiveGame(gameData); setCountdown(null); }
            } else { setActiveGame(null); }
            setGameLoading(false);
        });
        
        const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists() && !activeGameRef.current) {
                const roomData = docSnap.data() as Room;
                const nextGameTime = roomData.nextGameTimestamp?.toDate().getTime();
                if (nextGameTime) {
                    const remaining = Math.round((nextGameTime - Date.now()) / 1000);
                    setCountdown(remaining > 0 ? remaining : null);
                } else { setCountdown(null); }
            }
        });
        return () => { gameUnsub(); roomUnsub(); };
    }, [roomId, featureFlags?.quizGameEnabled]);

    useEffect(() => {
        if (countdown === null || countdown < 0) return;
        if (countdown === 0 && isHost) { if (!activeGameRef.current) { startGameInRoom(roomId).catch(err => console.error("Failed to auto-start game:", err)); }}
        const timerId = setTimeout(() => { setCountdown(prev => (prev !== null ? prev - 1 : null)); }, 1000);
        return () => clearTimeout(timerId);
    }, [countdown, isHost, roomId]);

    useEffect(() => {
        if (chatScrollRef.current) { chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }
    }, [messages]);
    
    const handleJoinVoice = useCallback(async () => { if (!user) return; await joinRoom(); }, [user, joinRoom]);
    const handleExitVoiceChat = useCallback(async () => { await leaveRoom(); setShowExitDialog(false); }, [leaveRoom]);
    const handleToggleMute = useCallback(async () => { if (!self || !user) return; await toggleSelfMute(); }, [self, user, toggleSelfMute]);
    const handleAnswerSubmit = useCallback(async (answerIndex: number) => { if (!user || !activeGame) return; try { await submitAnswer(roomId, activeGame.id, user.uid, answerIndex); } catch (error: any) { toast({ variant: "destructive", description: error.message || "Cevap gönderilemedi." }); }}, [user, activeGame, roomId, toast]);
    const handleGameTimerEnd = useCallback(() => { if (!activeGame || !isHost) return; endGameWithoutWinner(roomId, activeGame.id); }, [activeGame, isHost, roomId]);

    const handleRequestToSpeak = async () => {
        if (!user || !room || !userData) return;
        setIsRequestingSpeak(true);
        try {
            await requestToSpeak(room.id, {uid: user.uid, username: userData.username, photoURL: userData.photoURL || null});
            toast({ description: "Söz hakkı isteği gönderildi." });
        } catch(e: any) {
            toast({ variant: 'destructive', description: e.message });
        } finally {
            setIsRequestingSpeak(false);
        }
    }

    const isLoading = authLoading || !room;
    const isRoomParticipant = room?.participants?.some(p => p.uid === user?.uid);
    if (isLoading) return <div className="flex h-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    return (
        <>
            <div className="flex flex-col lg:flex-row h-full">
                <div className="flex-1 flex flex-col bg-background">
                    <RoomHeader 
                        room={room} 
                        isHost={isHost} 
                        onParticipantListToggle={() => setIsParticipantSheetOpen(true)} 
                        onBackClick={() => setShowExitDialog(true)} 
                        onStartGameClick={() => setIsGameLobbyOpen(true)}
                    />
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                        <TextChat messages={messages} loading={messagesLoading} roomId={roomId} />
                    </div>
                    <footer className="p-3 border-t bg-background shrink-0">
                        <ChatMessageInput roomId={roomId} canSendMessage={isRoomParticipant || false} />
                    </footer>
                </div>
                
                <aside className="w-full lg:w-80 lg:border-l shrink-0 bg-card">
                     <div className="h-full flex flex-col p-4">
                        <h3 className="font-bold mb-4 text-foreground">SESLİ SOHBET</h3>
                        {screenSharer ? (
                            <div className='animate-in fade-in duration-300'>
                                {isSharingScreen && localScreenStream && <ScreenShareView stream={localScreenStream} />}
                                {remoteScreenStream && <ScreenShareView stream={remoteScreenStream} />}
                                <p className="text-center text-xs text-muted-foreground mt-2">{screenSharer.username} ekranını paylaşıyor...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
                                {participants.length > 0 ? (
                                    participants.map((p) => (
                                        <VoiceUserIcon key={p.uid} room={room} participant={p} isHost={isHost} isModerator={isModerator} currentUserId={user!.uid} />
                                    ))
                                ) : (
                                    <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground h-full py-8">
                                        <p>Sesli sohbette kimse yok.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="mt-auto pt-4">
                            {featureFlags?.quizGameEnabled && (
                                <div className="mb-4">
                                    {gameLoading ? null : activeGame && gameSettings && user ? (
                                        <RoomGameCard game={activeGame} settings={gameSettings} onAnswerSubmit={handleAnswerSubmit} onTimerEnd={handleGameTimerEnd} currentUserId={user.uid} />
                                    ) : countdown !== null && countdown > 0 && countdown <= 20 ? (
                                        <GameCountdownCard timeLeft={countdown} />
                                    ) : null}
                                </div>
                            )}
                             {isConnected && user ? (
                                <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg">
                                    {canSpeak ? (
                                        <Button onClick={handleToggleMute} variant="ghost" size="icon" className="rounded-full">
                                            {self?.isMuted ? <MicOff className="h-5 w-5 text-destructive"/> : <Mic className="h-5 w-5"/>}
                                        </Button>
                                    ) : (
                                        <Button onClick={handleRequestToSpeak} variant="ghost" size="icon" className="rounded-full" disabled={hasRequestedSpeak || isRequestingSpeak}>
                                            {isRequestingSpeak ? <Loader2 className="h-5 w-5 animate-spin" /> : <Hand className="h-5 w-5"/>}
                                        </Button>
                                    )}
                                    <Button onClick={isSharingScreen ? stopScreenShare : startScreenShare} variant="ghost" size="icon" className="rounded-full">
                                        {isSharingScreen ? <ScreenShareOff className="h-5 w-5 text-destructive"/> : <ScreenShare className="h-5 w-5"/>}
                                    </Button>
                                    <Button onClick={handleExitVoiceChat} variant="destructive" size="icon" className="rounded-full">
                                        <PhoneOff className="h-5 w-5" />
                                        <span className="sr-only">Ayrıl</span>
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={handleJoinVoice} disabled={isConnecting || isConnected} className="w-full">
                                    {isConnecting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Mic className="h-5 w-5"/>}
                                    <span className="ml-2">Sesli Sohbete Katıl</span>
                                </Button>
                            )}
                        </div>
                     </div>
                </aside>
            </div>

            <ParticipantListSheet isOpen={isParticipantSheetOpen} onOpenChange={setIsParticipantSheetOpen} room={room} />
            <OpenPortalDialog isOpen={isPortalDialogOpen} onOpenChange={setIsPortalDialogOpen} roomId={roomId} roomName={room?.name || ''} />
            <GameLobbyDialog 
                isOpen={isGameLobbyOpen} 
                onOpenChange={setIsGameLobbyOpen}
                roomId={roomId}
                participants={room?.participants || []}
            />
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Odadan Ayrıl</AlertDialogTitle>
                        <AlertDialogDescription>Ne yapmak istersiniz? Odayı arka plana alabilir veya sadece sesli sohbetten çıkabilirsiniz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                         <Button variant="outline" onClick={() => { router.push('/rooms'); setShowExitDialog(false); }}>Arka Plana Al</Button>
                        <Button onClick={handleExitVoiceChat}>Sesli sohbetten çık</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}