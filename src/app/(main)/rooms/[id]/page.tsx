// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
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

import type { Room, ActiveGame, GameSettings, Message, ActiveGameSession } from '@/lib/types';
import RoomFooter from '@/components/rooms/RoomFooter';
import SpeakerLayout from '@/components/rooms/SpeakerLayout';
import RoomInfoCards from '@/components/rooms/RoomInfoCards';
import { getGameSettings, startGameInRoom } from '@/lib/actions/gameActions';
import GameCountdownCard from '@/components/game/GameCountdownCard';
import RoomGameCard from '@/components/game/RoomGameCard';
import { endGameWithoutWinner, submitAnswer, deleteMatchRoom } from '@/lib/actions/gameActions';
import GameResultCard from '@/components/game/GameResultCard';
import GameLobbyDialog from '@/components/game/GameLobbyDialog';
import ActiveGameArea from '@/components/game/ActiveGameArea';
import GameInviteMessage from '@/components/game/GameInviteMessage';
import MatchConfirmationControls from '@/components/rooms/MatchConfirmationControls';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    // --- Auth & Contexts ---
    const { user, userData, featureFlags, loading: authLoading } = useAuth();
    const { setActiveRoomId, joinRoom, isConnected, isConnecting } = useVoiceChat();

    // --- Component State ---
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const [isSpeakerLayoutCollapsed, setIsSpeakerLayoutCollapsed] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const roomRef = useRef<Room | null>(null);

    // --- Game State ---
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<ActiveGame | null>(null);
    const [quizCountdown, setQuizCountdown] = useState<number | null>(null);
    const [finishedGame, setFinishedGame] = useState<any>(null);
    const [isGameLobbyOpen, setIsGameLobbyOpen] = useState(false);
    const [activeGameSession, setActiveGameSession] = useState<ActiveGameSession | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    useEffect(() => {
        if (roomId) setActiveRoomId(roomId);
        return () => setActiveRoomId(null);
    }, [roomId, setActiveRoomId]);

    // Auto-join voice chat with mic ON
    useEffect(() => {
        if (user && roomId && !isConnected && !isConnecting) {
            joinRoom({ muted: false });
        }
    }, [user, roomId, isConnected, isConnecting, joinRoom]);
    
    // Auto-start quiz game if host is present
    useEffect(() => {
        if (!isHost || !room || !featureFlags?.quizGameEnabled) return;

        const checkAndStartGame = async () => {
            if (!room?.id) return;
            const now = Timestamp.now();
            const nextGameTime = room.nextGameTimestamp as Timestamp | undefined;
            if (!nextGameTime || now.toMillis() > nextGameTime.toMillis()) {
                await startGameInRoom(room.id);
            }
        };
        const interval = setInterval(checkAndStartGame, 30000); // Check every 30 seconds
        checkAndStartGame();
        return () => clearInterval(interval);
    }, [isHost, room, featureFlags?.quizGameEnabled]);

    useEffect(() => {
        roomRef.current = room;
    }, [room]);


    // Room, messages, and game settings listener
    useEffect(() => {
        if (!roomId) return;
        
        getGameSettings().then(setGameSettings);
        
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
        
        // Listener for active game sessions
        const activeGameQuery = query(collection(db, 'rooms', roomId, 'game_sessions'), where('status', 'in', ['pending', 'active']), limit(1));
        const gameSessionUnsub = onSnapshot(activeGameQuery, (snapshot) => {
            if (!snapshot.empty) {
                const gameDoc = snapshot.docs[0];
                setActiveGameSession({ id: gameDoc.id, ...gameDoc.data() } as ActiveGameSession);
            } else {
                setActiveGameSession(null);
            }
        });
        
        return () => { 
            roomUnsub(); 
            messagesUnsub(); 
            gameSessionUnsub();
            // Cleanup: delete converted/declined match rooms after leaving
            if (roomRef.current && (roomRef.current.status === 'closed_declined' || roomRef.current.status === 'converted_to_dm')) {
                deleteMatchRoom(roomId);
            }
        };
    }, [roomId, router, toast]);

    // Handle room status changes for matchmaking
    useEffect(() => {
        if (!room || room.type !== 'match' || !user) return;

        if (room.status === 'converted_to_dm' && room.finalChatId) {
            toast({ title: "Harika!", description: "Sohbetiniz kalıcı hale getirildi. Kaldığınız yerden devam edebilirsiniz." });
            router.push(`/dm/${room.finalChatId}`);
        } else if (room.status === 'closed_declined') {
            toast({ variant: 'destructive', description: "Eşleşme sonlandırıldı." });
            router.push('/matchmaking');
        }
    }, [room, user, router, toast]);
    
    // Finished game listener (to show results)
    useEffect(() => {
        if (!roomId) return;
        const q = query(collection(db, 'rooms', roomId, 'games'), where('status', '==', 'finished'), orderBy('finishedAt', 'desc'), limit(1));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const gameDoc = snapshot.docs[0];
                const finishedGameData = { id: gameDoc.id, ...gameDoc.data() } as any;
                if (finishedGameData.finishedAt && Date.now() - finishedGameData.finishedAt.toMillis() < 15000) {
                     setFinishedGame(finishedGameData);
                     const timer = setTimeout(() => setFinishedGame(null), 10000); // Show for 10 seconds
                     return () => clearTimeout(timer);
                } else {
                    setFinishedGame(null);
                }
            } else {
                setFinishedGame(null);
            }
        });
        return () => unsub();
    }, [roomId]);
    

    const handleQuizAnswerSubmit = async (answerIndex: number) => {
        if (!activeQuiz || !user) return;
        try {
            await submitAnswer(roomId, activeQuiz.id, user.uid, answerIndex);
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        }
    };

    const handleGameTimerEnd = async () => {
        if (!activeQuiz) return;
        try {
            await endGameWithoutWinner(roomId, activeQuiz.id);
        } catch (e: any) {
            console.error("Error ending game:", e);
        }
    }
    
    useEffect(() => {
        if (chatScrollRef.current) { chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }
    }, [messages]);
    
    const isLoading = authLoading || !room;
    if (isLoading) return <div className="flex h-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    const isMatchRoom = room?.type === 'match';

    const renderGameContent = () => {
        if (activeGameSession && user) {
            return <ActiveGameArea game={activeGameSession} roomId={roomId} currentUser={{uid: user.uid, username: user.displayName!}} />
        }
        if (finishedGame) {
           return <GameResultCard game={finishedGame} />;
        }
        if (quizCountdown) {
            return <GameCountdownCard timeLeft={quizCountdown} />;
        }
        if (activeQuiz && gameSettings) {
            return <RoomGameCard game={activeQuiz} settings={gameSettings} onAnswerSubmit={handleQuizAnswerSubmit} onTimerEnd={handleGameTimerEnd} currentUserId={user!.uid} />;
        }
        return null;
    };

    const gameContent = renderGameContent();

    return (
        <>
            <div className="flex flex-col h-full bg-background text-foreground">
                 <RoomHeader 
                    room={room} 
                    isHost={isHost} 
                    onParticipantListToggle={() => setIsParticipantSheetOpen(true)} 
                    onBackClick={() => router.back()}
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
                
                 {/* Sticky top content */}
                <div className="p-4 space-y-4 shrink-0">
                     {isMatchRoom && (room.status === 'open' || room.status === 'converting') && user && (
                        <MatchConfirmationControls room={room} currentUserId={user.uid} />
                    )}
                    {gameContent}
                    <RoomInfoCards room={room} isOwner={isHost} />
                </div>

                <main ref={chatScrollRef} className="flex-1 flex flex-col overflow-y-auto">
                    <TextChat messages={messages} loading={messagesLoading} room={room} />
                </main>

                <RoomFooter room={room} onGameLobbyOpen={() => setIsGameLobbyOpen(true)} />
            </div>

            <ParticipantListSheet isOpen={isParticipantSheetOpen} onOpenChange={setIsParticipantSheetOpen} room={room} />
            <GameLobbyDialog 
                isOpen={isGameLobbyOpen} 
                onOpenChange={setIsGameLobbyOpen} 
                roomId={roomId} 
                participants={room.participants} 
            />
        </>
    );
}
