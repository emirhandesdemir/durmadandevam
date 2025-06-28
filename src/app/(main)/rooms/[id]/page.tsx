// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Loader2, Mic, MicOff, Plus, Crown, PhoneOff, ScreenShare, ScreenShareOff, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TextChat, { type Message } from '@/components/chat/text-chat';
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
import type { Room, ActiveGame, GameSettings } from '@/lib/types';
import GameCountdownCard from '@/components/game/GameCountdownCard';
import RoomGameCard from '@/components/game/RoomGameCard';
import { startGameInRoom, submitAnswer, endGameWithoutWinner, getGameSettings } from '@/lib/actions/gameActions';


export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    // --- Auth & Contexts ---
    const { user, loading: authLoading, featureFlags } = useAuth();
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
    const [isVoiceStageCollapsed, setVoiceStageCollapsed] = useState(false);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // --- Game State ---
    const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [gameLoading, setGameLoading] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    const screenSharer = useMemo(() => participants.find(p => p.isSharingScreen), [participants]);
    const remoteScreenStream = screenSharer && !isSharingScreen ? remoteScreenStreams[screenSharer.uid] : null;

    // --- Effects ---

    useEffect(() => {
        if (roomId) {
            setActiveRoomId(roomId);
        }
        return () => setActiveRoomId(null);
    }, [roomId, setActiveRoomId]);

    // Fetch game settings on mount
    useEffect(() => {
        getGameSettings().then(setGameSettings);
    }, []);

    // Oda verisi ve mesajları dinle
    useEffect(() => {
        if (!roomId) return;
        
        const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists()) {
                 setRoom({ id: docSnap.id, ...docSnap.data() } as Room);
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

        return () => {
            roomUnsub();
            messagesUnsub();
        };
    }, [roomId, router, toast]);

    // Listen for games and countdowns
    useEffect(() => {
        if (!roomId || !featureFlags?.quizGameEnabled || !gameSettings) {
            setGameLoading(false);
            return;
        }

        setGameLoading(true);

        const gamesQuery = query(collection(db, `rooms/${roomId}/games`), where("status", "==", "active"), limit(1));
        const gameUnsub = onSnapshot(gamesQuery, (snapshot) => {
            if (!snapshot.empty) {
                const gameData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ActiveGame;
                setActiveGame(gameData);
                setCountdown(null);
                setGameLoading(false);
            } else {
                setActiveGame(null);
            }
        });
        
        const roomTimestampUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
             if (docSnap.exists() && !activeGame) {
                const roomData = docSnap.data() as Room;
                const nextGameTime = roomData.nextGameTimestamp?.toDate().getTime();
                if (nextGameTime) {
                    const remaining = Math.round((nextGameTime - Date.now()) / 1000);
                    setCountdown(remaining > 0 ? remaining : 0);
                }
            }
            setGameLoading(false);
        });

        return () => {
            gameUnsub();
            roomTimestampUnsub();
        };
    }, [roomId, featureFlags, gameSettings, activeGame]);

    // Handle countdown ticker and game start
    useEffect(() => {
        if (countdown === null || countdown < 0) return;
        if (countdown === 0 && isHost && !activeGame) {
             startGameInRoom(roomId).catch(err => console.error("Failed to start game:", err));
        }

        const timerId = setTimeout(() => {
            setCountdown(prev => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => clearTimeout(timerId);
    }, [countdown, isHost, roomId, activeGame]);

    // Scroll chat to bottom on new message
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages]);
    
    // --- Callbacks ---

    const handleJoinVoice = useCallback(async () => {
        if (!user) return;
        await joinRoom();
    }, [user, joinRoom]);

    const handleLeaveAndNavigate = useCallback(async () => {
        await leaveRoom();
        router.push('/rooms');
    }, [leaveRoom, router]);

    const handleToggleMute = useCallback(async () => {
        if (!self || !user) return;
        await toggleSelfMute();
    }, [self, user, toggleSelfMute]);

    const handleAnswerSubmit = useCallback(async (answerIndex: number) => {
        if (!user || !activeGame) return;
        try {
            await submitAnswer(roomId, activeGame.id, user.uid, answerIndex);
        } catch (error: any) {
            toast({ variant: "destructive", description: error.message || "Cevap gönderilemedi." });
        }
    }, [user, activeGame, roomId, toast]);

    const handleGameTimerEnd = useCallback(() => {
        if (!activeGame || !isHost) return;
        endGameWithoutWinner(roomId, activeGame.id);
    }, [activeGame, isHost, roomId]);

    // --- Memoized Values ---
    
    const { hostParticipant, otherParticipants } = useMemo(() => {
        if (!participants || !room) return { hostParticipant: null, otherParticipants: [] };
        const host = participants.find(p => p.uid === room.createdBy.uid);
        const others = participants.filter(p => p.uid !== room.createdBy.uid);
        return { hostParticipant: host, otherParticipants: others };
    }, [participants, room]);

    const isLoading = authLoading || !room;
    const isRoomParticipant = room?.participants?.some(p => p.uid === user?.uid);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-900">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <>
            <div className="flex h-full flex-col bg-gray-900 text-gray-200">
                <RoomHeader 
                    room={room} 
                    isHost={isHost} 
                    onParticipantListToggle={() => setIsParticipantSheetOpen(true)}
                    onBackClick={() => setShowExitDialog(true)}
                />
                
                <div className="p-4 border-b border-gray-700/50 shrink-0">
                    {screenSharer ? (
                         <div className='animate-in fade-in duration-300'>
                            {isSharingScreen && localScreenStream && <ScreenShareView stream={localScreenStream} />}
                            {remoteScreenStream && <ScreenShareView stream={remoteScreenStream} />}
                            <p className="text-center text-xs text-muted-foreground mt-2">{screenSharer.username} ekranını paylaşıyor...</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             {!isVoiceStageCollapsed ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center justify-center min-h-28">
                                        {hostParticipant ? (
                                            <VoiceUserIcon key={hostParticipant.uid} participant={hostParticipant} isHost={isHost} currentUserId={user!.uid} roomId={roomId} isParticipantTheHost={true} size="lg"/>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <div className="flex items-center justify-center h-20 w-20 rounded-full bg-gray-800/40 border-2 border-dashed border-gray-600">
                                                    <Crown className="h-8 w-8 text-gray-600" />
                                                </div>
                                                <p className="text-xs font-semibold">Oda Sahibi</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-center">
                                        {otherParticipants.map((participant) => (
                                            <VoiceUserIcon key={participant.uid} participant={participant} isHost={isHost} currentUserId={user!.uid} roomId={roomId} isParticipantTheHost={false} size="sm"/>
                                        ))}
                                        {Array.from({ length: Math.max(0, 8 - otherParticipants.length) }).map((_, index) => (
                                            <div key={`placeholder-${index}`} className="flex flex-col items-center justify-center aspect-square bg-gray-800/40 rounded-full">
                                                <Plus className="h-6 w-6 text-gray-600" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full min-h-28 items-center justify-center gap-2 py-4 animate-in fade-in duration-300">
                                    {participants.length > 0 ? participants.map(p => (
                                        <TooltipProvider key={p.uid}>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Avatar className="h-10 w-10 border-2 border-transparent data-[speaking=true]:border-green-500" data-speaking={p.isSpeaker && !p.isMuted}>
                                                        <AvatarImage src={p.photoURL || undefined} />
                                                        <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-gray-800 border-gray-700 text-white"><p>{p.username}</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )) : ( <p className="text-sm text-gray-500">Sesli sohbette kimse yok.</p> )}
                                </div>
                            )}

                            <div className="flex justify-center">
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => setVoiceStageCollapsed(!isVoiceStageCollapsed)}>
                                    <ChevronsUpDown className="h-4 w-4 mr-2" />
                                    {isVoiceStageCollapsed ? "Sohbeti Genişlet" : "Sohbeti Küçült"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
                     {featureFlags?.quizGameEnabled && (
                        <div className="mb-4">
                            {gameLoading ? (
                                <div className="flex items-center justify-center h-24">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : activeGame && gameSettings && user ? (
                                <RoomGameCard 
                                    game={activeGame}
                                    settings={gameSettings}
                                    onAnswerSubmit={handleAnswerSubmit}
                                    onTimerEnd={handleGameTimerEnd}
                                    currentUserId={user.uid}
                                />
                            ) : countdown !== null && countdown > 0 && countdown <= 20 ? (
                                <GameCountdownCard timeLeft={countdown} />
                            ) : null}
                        </div>
                    )}
                    <TextChat messages={messages} loading={messagesLoading} />
                </div>

                <footer className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent pointer-events-none">
                    <div className="flex items-center gap-2 p-2 bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-700/50 pointer-events-auto">
                        {isConnected && user ? (
                            <>
                                <Button onClick={handleToggleMute} variant="ghost" size="icon" className="rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                                    {self?.isMuted ? <MicOff className="h-5 w-5 text-red-500"/> : <Mic className="h-5 w-5 text-white"/>}
                                </Button>
                                <Button onClick={isSharingScreen ? stopScreenShare : startScreenShare} variant="ghost" size="icon" className="rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                                    {isSharingScreen ? <ScreenShareOff className="h-5 w-5 text-red-500"/> : <ScreenShare className="h-5 w-5 text-white"/>}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleJoinVoice} disabled={isConnecting || isConnected} className="rounded-full bg-primary text-primary-foreground h-10 px-4">
                                {isConnecting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Mic className="h-5 w-5"/>}
                                <span className="ml-2">Katıl</span>
                            </Button>
                        )}
                        <ChatMessageInput roomId={roomId} canSendMessage={isRoomParticipant || false} />
                    </div>
                </footer>
            </div>
             <ParticipantListSheet
                isOpen={isParticipantSheetOpen}
                onOpenChange={setIsParticipantSheetOpen}
                participants={room.participants || []}
            />
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Odadan Ayrıl</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ne yapmak istersiniz? Odayı arka plana alabilir veya sesli sohbetten tamamen ayrılabilirsiniz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                         <Button variant="outline" onClick={() => {
                            router.push('/rooms');
                            setShowExitDialog(false);
                         }}>
                            Arka Plana Al
                        </Button>
                        <Button onClick={() => {
                            handleLeaveAndNavigate();
                            setShowExitDialog(false);
                        }}>
                            Ayrıl ve Kapat
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
