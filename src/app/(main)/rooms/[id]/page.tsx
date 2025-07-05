
// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
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
import { getGameSettings, startGameInRoom, submitAnswer, endGameWithoutWinner } from '@/lib/actions/gameActions';
import RoomGameCard from '@/components/game/RoomGameCard';
import { joinRoom } from '@/lib/actions/roomActions';
import GameResultCard from '@/components/game/GameResultCard';
import GameLobbyDialog from '@/components/game/GameLobbyDialog';
import ActiveGameArea from '@/components/game/ActiveGameArea';
import GameInviteMessage from '@/components/game/GameInviteMessage';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    const { user, userData, featureFlags, loading: authLoading } = useAuth();
    const { setActiveRoomId, isConnected, isConnecting } = useVoiceChat();

    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const [isSpeakerLayoutCollapsed, setIsSpeakerLayoutCollapsed] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const roomRef = useRef<Room | null>(null);

    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<ActiveGame | null>(null);
    const [finishedGame, setFinishedGame] = useState<any>(null);
    const [isGameLobbyOpen, setIsGameLobbyOpen] = useState(false);
    const [activeGameSession, setActiveGameSession] = useState<ActiveGameSession | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    useEffect(() => {
        if (roomId) setActiveRoomId(roomId);
        return () => setActiveRoomId(null);
    }, [roomId, setActiveRoomId]);
    

    useEffect(() => {
        if (!room || !featureFlags?.quizGameEnabled || !user) return;
    
        const designatedStarter = room.participants.sort((a, b) => a.uid.localeCompare(b.uid))[0];
    
        if (!designatedStarter || designatedStarter.uid !== user.uid) return;
    
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
    }, [room, user, featureFlags?.quizGameEnabled]);

    useEffect(() => {
        roomRef.current = room;
    }, [room]);

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
        
        const activeGameQuery = query(collection(db, 'rooms', roomId, 'game_sessions'), where('status', 'in', ['pending', 'active']), limit(1));
        const gameSessionUnsub = onSnapshot(activeGameQuery, (snapshot) => {
            if (!snapshot.empty) {
                const gameDoc = snapshot.docs[0];
                setActiveGameSession({ id: gameDoc.id, ...gameDoc.data() } as ActiveGameSession);
            } else {
                setActiveGameSession(null);
            }
        });

        const activeQuizQuery = query(collection(db, 'rooms', roomId, 'games'), where('status', '==', 'active'), limit(1));
        const activeQuizUnsub = onSnapshot(activeQuizQuery, (snapshot) => {
            if (!snapshot.empty) {
                const gameDoc = snapshot.docs[0];
                setActiveQuiz({ id: gameDoc.id, ...doc.data() } as ActiveGame);
            } else {
                setActiveQuiz(null);
            }
        });
        
        return () => { 
            roomUnsub(); 
            messagesUnsub(); 
            gameSessionUnsub();
            activeQuizUnsub();
        };
    }, [roomId, router, toast]);

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
    
    const renderGameContent = () => {
        if (activeGameSession && user) {
            return <ActiveGameArea game={activeGameSession} roomId={roomId} currentUser={{uid: user.uid, username: user.displayName!}} />
        }
        if (finishedGame) {
           return <GameResultCard game={finishedGame} />;
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
                
                 <div className="p-4 shrink-0">
                    <RoomInfoCards room={room} isOwner={isHost} />
                </div>

                <main ref={chatScrollRef} className="flex-1 flex flex-col overflow-y-auto pt-0 p-4">
                    {gameContent}
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
