// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Loader2, Mic, MicOff, Crown, PhoneOff, ScreenShare, ScreenShareOff, ChevronsUpDown, Gift, Music, VolumeX, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TextChat from '@/components/chat/text-chat';
import ChatMessageInput from '@/components/chat/ChatMessageInput';
import VoiceUserIcon from '@/components/voice/VoiceUserIcon';
import ParticipantListSheet from '@/components/rooms/ParticipantListSheet';
import RoomHeader from '@/components/rooms/RoomHeader';
import ScreenShareView from '@/components/voice/ScreenShareView';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import OpenPortalDialog from '@/components/rooms/OpenPortalDialog';


export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    // --- Auth & Contexts ---
    const { user, loading: authLoading, featureFlags } = useAuth();
    const { 
        self, isConnecting, isConnected, isSharingScreen, localScreenStream, remoteScreenStreams,
        startScreenShare, stopScreenShare, joinRoom, leaveRoom, toggleSelfMute, handleRequestToSpeak,
        participants, setActiveRoomId, playMusic, stopMusic, isMusicPlaying, isProcessingMusic
    } = useVoiceChat();

    // --- Component State ---
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [isPortalDialogOpen, setIsPortalDialogOpen] = useState(false);
    const [isVoiceStageCollapsed, setVoiceStageCollapsed] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const musicInputRef = useRef<HTMLInputElement>(null);

    // --- Game State ---
    const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [gameLoading, setGameLoading] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);
    const activeGameRef = useRef(activeGame);

    useEffect(() => { activeGameRef.current = activeGame; }, [activeGame]);

    const isHost = user?.uid === room?.createdBy.uid;
    const isModerator = room?.moderators?.includes(user?.uid || '') || false;
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
        }, (error) => {
            console.error("Mesajlar alınırken hata:", error);
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
    const handleMusicFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { await playMusic(file); } e.target.value = ''; };
    const onHandRaise = async () => { if(!self) return; await handleRequestToSpeak(!self.handRaised); };

    const isLoading = authLoading || !room;
    const isRoomParticipant = room?.participants?.some(p => p.uid === user?.uid);
    if (isLoading) return <div className="flex h-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    return (
        <>
            <div className="flex flex-col h-full bg-background text-foreground">
                <RoomHeader room={room} isHost={isHost} onParticipantListToggle={() => setIsParticipantSheetOpen(true)} onBackClick={() => setShowExitDialog(true)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 shrink-0 space-y-4 border-b">
                        {screenSharer ? (
                            <div className='animate-in fade-in duration-300'>
                                {isSharingScreen && localScreenStream && <ScreenShareView stream={localScreenStream} />}
                                {remoteScreenStream && <ScreenShareView stream={remoteScreenStream} />}
                                <p className="text-center text-xs text-muted-foreground mt-2">{screenSharer.username} ekranını paylaşıyor...</p>
                            </div>
                        ) : (
                           <div className="relative min-h-[10rem]">
                                {!isVoiceStageCollapsed ? (
                                <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-4 animate-in fade-in duration-300">
                                    {participants.length > 0 ? (
                                    participants
                                        .sort((a, b) => {
                                            const aIsHost = a.uid === room.createdBy.uid; const bIsHost = b.uid === room.createdBy.uid;
                                            if (aIsHost) return -1; if (bIsHost) return 1;
                                            const aIsMod = room.moderators?.includes(a.uid); const bIsMod = room.moderators?.includes(b.uid);
                                            if (aIsMod && !bIsMod) return -1; if (!aIsMod && bIsMod) return 1;
                                            return 0;
                                        })
                                        .map((p) => (
                                        <VoiceUserIcon key={p.uid} room={room} participant={p} isHost={isHost} isModerator={isModerator} currentUserId={user!.uid} size="sm" />
                                        ))
                                    ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                                        <Mic className="h-10 w-10 mb-2" />
                                        <p>Sesli sohbete katılın.</p>
                                    </div>
                                    )}
                                </div>
                                ) : (
                                <div className="flex h-full min-h-[10rem] items-center justify-center gap-2 py-4 animate-in fade-in duration-300">
                                    {participants.length > 0 ? participants.map(p => (
                                    <TooltipProvider key={p.uid}>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Avatar className="h-10 w-10 border-2 border-transparent data-[speaking=true]:border-green-500" data-speaking={p.isSpeaker && !p.isMuted}>
                                                    <AvatarImage src={p.photoURL || undefined} />
                                                    <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-muted border-border text-foreground"><p>{p.username}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    )) : ( <p className="text-sm text-muted-foreground">Sesli sohbette kimse yok.</p> )}
                                </div>
                                )}
                                {participants.length > 0 && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setVoiceStageCollapsed(!isVoiceStageCollapsed)}>
                                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                                        {isVoiceStageCollapsed ? "Genişlet" : "Küçült"}
                                    </Button>
                                </div>
                                )}
                            </div>
                        )}
                        {featureFlags?.quizGameEnabled && (
                            <div className="pt-2">
                                {gameLoading ? null : activeGame && gameSettings && user ? (
                                    <RoomGameCard game={activeGame} settings={gameSettings} onAnswerSubmit={handleAnswerSubmit} onTimerEnd={handleGameTimerEnd} currentUserId={user.uid} />
                                ) : countdown !== null && countdown > 0 && countdown <= 20 ? (
                                    <GameCountdownCard timeLeft={countdown} />
                                ) : null}
                            </div>
                        )}
                    </div>
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                        <TextChat messages={messages} loading={messagesLoading} />
                    </div>
                </div>

                <footer className="p-3 border-t bg-background shrink-0 flex items-center gap-2">
                    <div className="flex-1">
                        <ChatMessageInput roomId={roomId} canSendMessage={isRoomParticipant || false} />
                    </div>
                    <div className="flex items-center gap-1">
                        {isConnected && user ? (
                            <>
                                <input type="file" ref={musicInputRef} onChange={handleMusicFileChange} className="hidden" accept="audio/*" />
                                {room.requestToSpeakEnabled && !self?.canSpeak && (
                                     <Button onClick={onHandRaise} variant="ghost" size="icon" className="rounded-full" data-active={self?.handRaised}>
                                        <Hand className={self?.handRaised ? "text-primary" : ""}/>
                                    </Button>
                                )}
                                <Button onClick={isMusicPlaying ? stopMusic : () => musicInputRef.current?.click()} variant="ghost" size="icon" className="rounded-full" disabled={isProcessingMusic}>
                                    {isProcessingMusic ? <Loader2 className="h-5 w-5 animate-spin"/> : (isMusicPlaying ? <VolumeX className="h-5 w-5 text-destructive"/> : <Music className="h-5 w-5"/>) }
                                </Button>
                                <Button onClick={handleToggleMute} variant="ghost" size="icon" className="rounded-full">
                                    {self?.isMuted ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
                                </Button>
                                <Button onClick={isSharingScreen ? stopScreenShare : startScreenShare} variant="ghost" size="icon" className="rounded-full">
                                    {isSharingScreen ? <ScreenShareOff className="h-5 w-5 text-destructive" /> : <ScreenShare className="h-5 w-5" />}
                                </Button>
                                <Button onClick={() => setShowExitDialog(true)} variant="destructive" size="icon" className="rounded-full">
                                    <PhoneOff className="h-5 w-5" />
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleJoinVoice} disabled={isConnecting || isConnected} className="rounded-full bg-primary text-primary-foreground h-10 px-6 font-semibold">
                                {isConnecting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Mic className="mr-2 h-5 w-5"/>}
                                <span>Katıl</span>
                            </Button>
                        )}
                         <Button onClick={() => setIsPortalDialogOpen(true)} variant="ghost" size="icon" className="rounded-full">
                            <Gift className="h-5 w-5 text-yellow-500" />
                        </Button>
                    </div>
                </footer>
            </div>
             <ParticipantListSheet isOpen={isParticipantSheetOpen} onOpenChange={setIsParticipantSheetOpen} room={room} />
             <OpenPortalDialog isOpen={isPortalDialogOpen} onOpenChange={setIsPortalDialogOpen} roomId={roomId} roomName={room?.name || ''} />
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
