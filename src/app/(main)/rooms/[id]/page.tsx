// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, where, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Loader2 } from 'lucide-react';
import TextChat from '@/components/chat/text-chat';
import ParticipantListSheet from '@/components/rooms/ParticipantListSheet';
import RoomHeader from '@/components/rooms/RoomHeader';

import type { Room, Message, Giveaway, ActiveGame, GameSettings, ActiveGameSession, MindWarSession, VoiceParticipant } from '@/lib/types';
import RoomFooter from '@/components/rooms/RoomFooter';
import SpeakerLayout from '@/components/rooms/SpeakerLayout';
import RoomInfoCards from '@/components/rooms/RoomInfoCards';
import GameResultCard from '@/components/game/GameResultCard';
import GiveawayCard from '@/components/rooms/GiveawayCard';
import { cn } from '@/lib/utils';
import GiveawayDialog from '@/components/rooms/GiveawayDialog';

// Import new game components and actions
import RoomGameCard from '@/components/game/RoomGameCard';
import GameCountdownCard from '@/components/game/GameCountdownCard';
import { startGameInRoom, submitAnswer, endGameWithoutWinner, generateQuestionsForGame, advanceToNextQuestion } from '@/lib/actions/gameActions';
import GameLobbyDialog from '@/components/game/GameLobbyDialog';
import ActiveGameArea from '@/components/game/ActiveGameArea';
import MindWarLobby from '@/components/games/mindwar/MindWarLobby';
import MindWarMainUI from '@/components/games/mindwar/MindWarMainUI';
import EventWelcomeDialog from '@/components/rooms/EventWelcomeDialog';


export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    // --- Auth & Contexts ---
    const { user, userData, featureFlags, loading: authLoading } = useAuth();
    const { joinVoice, setActiveRoomId } = useVoiceChat();

    // --- Component State ---
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const [isSpeakerLayoutCollapsed, setIsSpeakerLayoutCollapsed] = useState(false);
    const [isGiveawayDialogOpen, setIsGiveawayDialogOpen] = useState(false);
    const [isGameLobbyOpen, setIsGameLobbyOpen] = useState(false);
    const [showEventWelcome, setShowEventWelcome] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    
    // --- Game State ---
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<ActiveGame | null>(null);
    const [finishedGame, setFinishedGame] = useState<any>(null);
    const [activeMindWarSession, setActiveMindWarSession] = useState<MindWarSession | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    useEffect(() => {
        if (roomId) {
            setActiveRoomId(roomId);
            joinVoice({ muted: true });
        }
        
        // Show welcome dialog for event rooms on first load
        const welcomeKey = `seen_welcome_${roomId}`;
        if (room?.type === 'event' && !sessionStorage.getItem(welcomeKey)) {
            setShowEventWelcome(true);
            sessionStorage.setItem(welcomeKey, 'true');
        }

        return () => setActiveRoomId(null);
    }, [roomId, room?.type, setActiveRoomId, joinVoice]);


    // Firestore Listeners (Room, Messages, Games)
    useEffect(() => {
        if (!roomId) return;
        
        const settingsRef = doc(db, 'config', 'gameSettings');
        const settingsUnsub = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) setGameSettings(docSnap.data() as GameSettings);
        });

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
                     setFinishedGame(gameData);
                     const timer = setTimeout(() => setFinishedGame(null), 10000); // Show for 10 seconds
                     return () => clearTimeout(timer);
                }
            }
            setFinishedGame(null);
        });
        
        // Listener for Mind Wars sessions
        const mindWarSessionUnsub = onSnapshot(query(collection(db, 'rooms', roomId, 'mindWarSessions'), where('status', '!=', 'finished'), limit(1)), (snapshot) => {
            if (snapshot.empty) {
                setActiveMindWarSession(null);
            } else {
                const sessionData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MindWarSession;
                setActiveMindWarSession(sessionData);
            }
        });
        
        return () => { roomUnsub(); messagesUnsub(); settingsUnsub(); finishedGameUnsub(); mindWarSessionUnsub(); };
    }, [roomId, router, toast]);
    
    // Auto-scroll chat
    useEffect(() => {
        if (chatScrollRef.current) { chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }
    }, [messages]);

    // Listen for active quiz games
    useEffect(() => {
        if (!roomId || !gameSettings) return;

        const gamesQuery = query(collection(db, 'rooms', roomId, 'games'), where('status', 'in', ['countdown', 'active']), limit(1));
        
        const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
            if (!snapshot.empty) {
                const gameData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ActiveGame;
                setActiveQuiz(gameData);
            } else {
                setActiveQuiz(null);
            }
        });
        return () => unsubscribe();
    }, [roomId, gameSettings]);

    // Handle game state transitions (countdown -> active)
    useEffect(() => {
        if (activeQuiz?.status !== 'countdown' || !isHost) return;
    
        const countdownEnd = (activeQuiz.countdownStartTime as Timestamp).toMillis() + 60000;
        const now = Date.now();
    
        const triggerGameStart = async () => {
            try {
                // The action is now idempotent, so no need to check status here again.
                await generateQuestionsForGame(roomId, activeQuiz.id);
            } catch (e) {
                console.error("Failed to start game from client", e);
            }
        };
    
        if (now >= countdownEnd) {
            triggerGameStart();
        } else {
            const timer = setTimeout(triggerGameStart, countdownEnd - now);
            return () => clearTimeout(timer);
        }
    }, [activeQuiz?.id, activeQuiz?.status, activeQuiz?.countdownStartTime, isHost, roomId]);


     // Handle question timer and auto-advance
     useEffect(() => {
        if (activeQuiz?.status !== 'active' || !gameSettings || !isHost) return;

        const startTime = (activeQuiz.startTime as Timestamp).toMillis();
        const duration = (gameSettings.questionTimerSeconds || 20) * 1000;
        const timeUp = startTime + duration;
        
        const now = Date.now();

        const triggerAdvance = async () => {
             try {
                await advanceToNextQuestion(roomId, activeQuiz.id);
            } catch (e) {
                console.error("Failed to advance question from client", e);
            }
        }

        if (now >= timeUp) {
            triggerAdvance();
        } else {
            const timer = setTimeout(triggerAdvance, timeUp - now);
            return () => clearTimeout(timer);
        }

    }, [activeQuiz?.id, activeQuiz?.status, activeQuiz?.startTime, activeQuiz?.currentQuestionIndex, gameSettings, isHost, roomId]);

    const handleAnswerSubmit = useCallback(async (answerIndex: number) => {
        if (!activeQuiz || !user) return;
        try {
            await submitAnswer(roomId, activeQuiz.id, user.uid, answerIndex);
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        }
    }, [activeQuiz, user, roomId, toast]);
    
    const isLoading = authLoading || !room;
    if (isLoading) return <div className="flex h-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

    const renderGameContent = () => {
        if (activeMindWarSession && user && userData) {
            return <MindWarMainUI session={activeMindWarSession} currentUser={{uid: user.uid, username: userData.username, photoURL: userData.photoURL || null}} roomId={roomId} />;
        }
        if (finishedGame) {
           return <GameResultCard game={finishedGame} />;
        }
        if (activeQuiz?.status === 'countdown') {
            return <GameCountdownCard game={activeQuiz} />;
        }
        if (activeQuiz?.status === 'active' && gameSettings && user) {
            return <RoomGameCard game={activeQuiz} settings={gameSettings} onAnswerSubmit={handleAnswerSubmit} currentUserId={user!.uid} />;
        }
        if (room.giveaway && room.giveaway.status !== 'idle') {
            return <GiveawayCard giveaway={room.giveaway} roomId={roomId} isHost={isHost} />;
        }
        return null;
    };
    
    const gameContent = renderGameContent();

    return (
        <>
            <EventWelcomeDialog isOpen={showEventWelcome} onOpenChange={setShowEventWelcome} room={room} />
            <div className={cn("flex flex-col h-full bg-background text-foreground", room.type === 'event' && 'event-room-bg')}>
                 <RoomHeader 
                    room={room} 
                    isHost={isHost} 
                    onParticipantListToggle={() => setIsParticipantSheetOpen(true)}
                    isSpeakerLayoutCollapsed={isSpeakerLayoutCollapsed}
                    onToggleCollapse={() => setIsSpeakerLayoutCollapsed(p => !p)}
                />
                
                <>
                    {!isSpeakerLayoutCollapsed && (
                         <div
                            className="overflow-hidden"
                        >
                            <SpeakerLayout room={room} />
                        </div>
                    )}
                </>

                <main ref={chatScrollRef} className="flex-1 flex flex-col overflow-y-auto">
                    {activeMindWarSession && user && userData ? (
                        <div className="p-2 md:p-4">
                            <MindWarMainUI session={activeMindWarSession} currentUser={{uid: user.uid, username: userData.username, photoURL: userData.photoURL || null}} roomId={roomId} />
                        </div>
                    ) : (
                        <>
                            {gameContent && (
                                <div className="p-4">
                                    {gameContent}
                                </div>
                            )}
                            <RoomInfoCards room={room} isOwner={isHost} />
                            <TextChat messages={messages} loading={messagesLoading} room={room} />
                        </>
                    )}
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
            <GameLobbyDialog
                isOpen={isGameLobbyOpen}
                onOpenChange={setIsGameLobbyOpen}
                roomId={roomId}
                participants={room.participants || []}
            />
        </>
    );
}
