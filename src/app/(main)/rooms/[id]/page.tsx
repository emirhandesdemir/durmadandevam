// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Loader2 } from 'lucide-react';
import TextChat from '@/components/chat/text-chat';
import ParticipantListSheet from '@/components/rooms/ParticipantListSheet';
import RoomHeader from '@/components/rooms/RoomHeader';
import { AnimatePresence, motion } from 'framer-motion';

import type { Room, Message, Giveaway, ActiveGame, GameSettings, ActiveGameSession, MindWarSession } from '@/lib/types';
import RoomFooter from '@/components/rooms/RoomFooter';
import SpeakerLayout from '@/components/rooms/SpeakerLayout';
import RoomInfoCards from '@/components/rooms/RoomInfoCards';
import GameResultCard from '@/components/game/GameResultCard';
import GiveawayCard from '@/components/rooms/GiveawayCard';
import { cn } from '@/lib/utils';
import GiveawayDialog from '@/components/rooms/GiveawayDialog';

// Import new game components and actions
import GameCountdownCard from '@/components/game/GameCountdownCard';
import RoomGameCard from '@/components/game/RoomGameCard';
import { startGameInRoom, submitAnswer, endGameWithoutWinner } from '@/lib/actions/gameActions';
import GameLobbyDialog from '@/components/game/GameLobbyDialog';
import ActiveGameArea from '@/components/game/ActiveGameArea';
import MindWarLobby from '@/components/games/mindwar/MindWarLobby';
import MindWarMainUI from '@/components/games/mindwar/MindWarMainUI';


export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    const { user, userData, featureFlags, loading: authLoading } = useAuth();
    const { setActiveRoomId } = useVoiceChat();

    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const [isSpeakerLayoutCollapsed, setIsSpeakerLayoutCollapsed] = useState(false);
    const [isGiveawayDialogOpen, setIsGiveawayDialogOpen] = useState(false);
    const [isGameLobbyOpen, setIsGameLobbyOpen] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    
    // Quiz Game State
    const [finishedQuizGame, setFinishedQuizGame] = useState<any>(null);
    const [activeQuizGame, setActiveQuizGame] = useState<ActiveGame | null>(null);
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [showGameCountdown, setShowGameCountdown] = useState(false);
    const [countdownTime, setCountdownTime] = useState(20);
    
    // New Interactive Game State
    const [activeGameSession, setActiveGameSession] = useState<ActiveGameSession | null>(null);
    const [activeMindWarSession, setActiveMindWarSession] = useState<MindWarSession | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    const activeQuizGameRef = useRef(activeQuizGame);
    activeQuizGameRef.current = activeQuizGame;

    useEffect(() => {
        if (roomId) setActiveRoomId(roomId);
        return () => setActiveRoomId(null);
    }, [roomId, setActiveRoomId]);

    // Firestore Listeners (Room, Messages, Games)
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
        
        const finishedGameQuery = query(collection(db, 'rooms', roomId, 'games'), where('status', '==', 'finished'), orderBy('finishedAt', 'desc'), limit(1));
        const finishedGameUnsub = onSnapshot(finishedGameQuery, (snapshot) => {
            if (!snapshot.empty) {
                const gameDoc = snapshot.docs[0];
                const gameData = { id: gameDoc.id, ...gameDoc.data() } as any;
                if (gameData.finishedAt && Date.now() - gameData.finishedAt.toMillis() < 15000) {
                     setFinishedQuizGame(gameData);
                     const timer = setTimeout(() => setFinishedQuizGame(null), 10000);
                     return () => clearTimeout(timer);
                }
            }
            setFinishedQuizGame(null);
        });
        
        // Listener for new interactive game sessions
        const gameSessionUnsub = onSnapshot(query(collection(db, 'rooms', roomId, 'game_sessions'), where('status', '!=', 'finished'), limit(1)), (snapshot) => {
            setActiveGameSession(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ActiveGameSession);
        });

        // Listener for Mind Wars sessions
        const mindWarSessionUnsub = onSnapshot(query(collection(db, 'rooms', roomId, 'mindWarSessions'), where('status', '!=', 'finished'), limit(1)), (snapshot) => {
            setActiveMindWarSession(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MindWarSession);
        });
        
        return () => { roomUnsub(); messagesUnsub(); finishedGameUnsub(); gameSessionUnsub(); mindWarSessionUnsub(); };
    }, [roomId, router, toast]);
    
    // Auto-scroll chat
    useEffect(() => {
        if (chatScrollRef.current) { chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }
    }, [messages]);

    // --- QUIZ GAME LOGIC ---
    // Fetch game settings
    useEffect(() => {
        const settingsRef = doc(db, 'config', 'gameSettings');
        const settingsUnsub = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) setGameSettings(docSnap.data() as GameSettings);
        });
        return () => settingsUnsub();
    }, []);
    
    // Listen for active quiz games
    useEffect(() => {
        if (!roomId || !gameSettings) return;

        const gamesQuery = query(collection(db, 'rooms', roomId, 'games'), where('status', '==', 'active'), limit(1));
        let gameTimeout: NodeJS.Timeout;

        const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
            clearTimeout(gameTimeout);
            if (!snapshot.empty) {
                const gameData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ActiveGame;
                setActiveQuizGame(gameData);

                const startTime = (gameData.startTime as Timestamp).toMillis();
                const questionDuration = (gameSettings.questionTimerSeconds || 15) * 1000;
                const timeElapsed = Date.now() - startTime;
                const timeLeftMs = questionDuration - timeElapsed;

                if (timeLeftMs > 0) {
                    gameTimeout = setTimeout(() => {
                        if (activeQuizGameRef.current?.id === gameData.id) {
                            endGameWithoutWinner(roomId, gameData.id);
                        }
                    }, timeLeftMs);
                } else {
                    endGameWithoutWinner(roomId, gameData.id);
                }
            } else {
                setActiveQuizGame(null);
            }
        });
        return () => { unsubscribe(); clearTimeout(gameTimeout); };
    }, [roomId, gameSettings]);

    // Quiz Game starting timer
    useEffect(() => {
        if (!room?.nextGameTimestamp || !featureFlags?.quizGameEnabled) {
            setShowGameCountdown(false);
            return;
        }

        const nextGameTime = (room.nextGameTimestamp as Timestamp).toMillis();
        let interval: NodeJS.Timeout;

        const updateCountdown = () => {
            const now = Date.now();
            const remainingSeconds = Math.round((nextGameTime - now) / 1000);
            
            if (remainingSeconds <= 20 && remainingSeconds > 0) {
                setCountdownTime(remainingSeconds);
                setShowGameCountdown(true);
            } else {
                setShowGameCountdown(false);
            }

            if (remainingSeconds <= 0) {
                setShowGameCountdown(false);
                clearInterval(interval);
                if (!activeQuizGameRef.current) {
                    startGameInRoom(roomId).catch(err => console.error("Failed to start game:", err));
                }
            }
        };
        
        updateCountdown();
        interval = setInterval(updateCountdown, 1000);
        
        return () => clearInterval(interval);
    }, [room?.nextGameTimestamp, roomId, featureFlags?.quizGameEnabled]);

    const handleAnswerSubmit = useCallback(async (answerIndex: number) => {
        if (!activeQuizGame || !user) return;
        try {
            await submitAnswer(roomId, activeQuizGame.id, user.uid, answerIndex);
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        }
    }, [activeQuizGame, user, roomId, toast]);
    
    // --- END GAME LOGIC ---

    const isLoading = authLoading || !room;
    if (isLoading) return <div className="flex h-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

    const renderGameContent = () => {
        if (activeMindWarSession && user && userData) {
             return <MindWarMainUI session={activeMindWarSession} currentUser={{uid: user.uid, username: userData.username, photoURL: userData.photoURL || null}} roomId={roomId} />;
        }
        if (activeGameSession && user) {
            return <ActiveGameArea game={activeGameSession} roomId={roomId} currentUser={{uid: user.uid, username: userData?.username || 'Biri'}} />
        }
        if (finishedQuizGame) {
            return <GameResultCard game={finishedQuizGame} />;
        }
        if (activeQuizGame && gameSettings) {
            return <RoomGameCard game={activeQuizGame} settings={gameSettings} onAnswerSubmit={handleAnswerSubmit} onTimerEnd={() => {}} currentUserId={user!.uid} />;
        }
        if (showGameCountdown && !activeQuizGame) {
            return <GameCountdownCard timeLeft={countdownTime} />;
        }
        if (room.giveaway && room.giveaway.status !== 'idle') {
            return <GiveawayCard giveaway={room.giveaway} roomId={roomId} isHost={isHost} />;
        }
        return null;
    };
    
    const gameContent = renderGameContent();

    return (
        <>
            <div className={cn("flex flex-col h-full bg-background text-foreground", room.type === 'event' && 'event-room-bg')}>
                 <RoomHeader 
                    room={room} 
                    isHost={isHost} 
                    onParticipantListToggle={() => setIsParticipantSheetOpen(true)} 
                    isSpeakerLayoutCollapsed={isSpeakerLayoutCollapsed}
                    onToggleCollapse={() => setIsSpeakerLayoutCollapsed(p => !p)}
                />
                
                <AnimatePresence>
                    {!isSpeakerLayoutCollapsed && (
                         <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <SpeakerLayout room={room} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <main ref={chatScrollRef} className="flex-1 flex flex-col overflow-y-auto">
                    {gameContent && (
                        <div className="p-4">
                            <AnimatePresence mode="wait">
                                <motion.div key={activeGameSession?.id || activeQuizGame?.id || activeMindWarSession?.id || 'info'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                    {gameContent}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    )}
                    <RoomInfoCards room={room} isOwner={isHost} />
                    <TextChat messages={messages} loading={messagesLoading} room={room} />
                </main>

                <RoomFooter room={room} onGameLobbyOpen={() => setIsGameLobbyOpen(true)} onGiveawayOpen={() => setIsGiveawayDialogOpen(true)} />
            </div>

            <ParticipantListSheet isOpen={isParticipantSheetOpen} onOpenChange={setIsParticipantSheetOpen} room={room} />
            <GiveawayDialog 
                isOpen={isGiveawayDialogOpen} 
                setIsOpen={setIsGiveawayDialogOpen} 
                roomId={roomId}
                isHost={isHost}
            />
            {room.participants && <GameLobbyDialog
                isOpen={isGameLobbyOpen}
                onOpenChange={setIsGameLobbyOpen}
                roomId={roomId}
                participants={room.participants}
            />}
        </>
    );
}
