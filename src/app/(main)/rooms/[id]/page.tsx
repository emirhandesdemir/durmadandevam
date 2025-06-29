// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Loader2 } from 'lucide-react';
import TextChat from '@/components/chat/text-chat';
import ParticipantListSheet from '@/components/rooms/ParticipantListSheet';
import RoomHeader from '@/components/rooms/RoomHeader';

// --- Game Imports ---
import type { Room, ActiveGameSession, GameSettings, Message, ActiveGame } from '@/lib/types';
import GameLobbyDialog from '@/components/game/GameLobbyDialog';
import RoomFooter from '@/components/rooms/RoomFooter';
import SpeakerLayout from '@/components/rooms/SpeakerLayout';
import RoomInfoCards from '@/components/rooms/RoomInfoCards';
import VoiceChatPanel from '@/components/chat/voice-chat-panel';
import { getGameSettings } from '@/lib/actions/gameActions';
import GameCountdownCard from '@/components/game/GameCountdownCard';
import RoomGameCard from '@/components/game/RoomGameCard';
import { submitAnswer, endGameWithoutWinner } from '@/lib/actions/gameActions';
import ActiveGameArea from '@/components/game/ActiveGameArea';
import GameResultCard from '@/components/game/GameResultCard';


export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    // --- Auth & Contexts ---
    const { user, loading: authLoading } = useAuth();
    const { 
        setActiveRoomId,
    } = useVoiceChat();

    // --- Component State ---
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const [isGameLobbyOpen, setIsGameLobbyOpen] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // --- Game State ---
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<ActiveGame | null>(null);
    const [quizCountdown, setQuizCountdown] = useState<number | null>(null);
    const [multiplayerGame, setMultiplayerGame] = useState<ActiveGameSession | null>(null);
    const [finishedGame, setFinishedGame] = useState<ActiveGameSession | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    useEffect(() => {
        if (roomId) setActiveRoomId(roomId);
        return () => setActiveRoomId(null);
    }, [roomId, setActiveRoomId]);

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
        
        return () => { roomUnsub(); messagesUnsub(); };
    }, [roomId, router, toast]);

    // Active multiplayer game listener
    useEffect(() => {
        if (!roomId) return;
        const q = query(collection(db, 'rooms', roomId, 'games'), where('status', '==', 'active'), limit(1));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const gameDoc = snapshot.docs[0];
                setMultiplayerGame({ id: gameDoc.id, ...gameDoc.data() } as ActiveGameSession);
            } else {
                setMultiplayerGame(null);
            }
        });
        return () => unsub();
    }, [roomId]);
    
    // Finished game listener (to show results)
    useEffect(() => {
        if (!roomId) return;
        const q = query(collection(db, 'rooms', roomId, 'games'), where('status', '==', 'finished'), orderBy('finishedAt', 'desc'), limit(1));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const gameDoc = snapshot.docs[0];
                const finishedGameData = { id: gameDoc.id, ...gameDoc.data() } as ActiveGameSession;
                // Only show the result card if the game finished in the last 15 seconds
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
    
    const renderRightPanelContent = () => {
         if (finishedGame) {
            return <GameResultCard game={finishedGame} />;
        }
        if (multiplayerGame && user) {
            return <ActiveGameArea game={multiplayerGame} roomId={roomId} currentUser={{uid: user.uid, username: user.displayName || 'Bilinmeyen'}} />;
        }
        if (quizCountdown) {
            return <GameCountdownCard timeLeft={quizCountdown} />;
        }
        if (activeQuiz && gameSettings) {
            return <RoomGameCard game={activeQuiz} settings={gameSettings} onAnswerSubmit={handleQuizAnswerSubmit} onTimerEnd={handleGameTimerEnd} currentUserId={user!.uid} />;
        }
        return <VoiceChatPanel />;
    };

    const isGameActive = !!(multiplayerGame || finishedGame || activeQuiz || quizCountdown);

    return (
        <>
            <div className="flex flex-col h-full bg-background text-foreground">
                 <RoomHeader 
                    room={room} 
                    isHost={isHost} 
                    onParticipantListToggle={() => setIsParticipantSheetOpen(true)} 
                    onBackClick={() => router.back()} 
                    onStartGameClick={() => setIsGameLobbyOpen(true)}
                />
                 <div className="flex-1 flex overflow-hidden">
                    <main ref={chatScrollRef} className="flex-1 flex flex-col overflow-y-auto pb-20">
                         {isGameActive ? (
                            <div className="p-4 md:hidden">
                                {renderRightPanelContent()}
                            </div>
                        ) : (
                            <SpeakerLayout room={room} />
                        )}
                        <RoomInfoCards room={room} isOwner={isHost} />
                        <TextChat messages={messages} loading={messagesLoading} room={room} />
                    </main>

                    <aside className="hidden md:flex md:w-[320px] lg:w-[350px] flex-col border-l bg-card/30 p-3">
                         <div className="flex-1 flex flex-col overflow-y-auto space-y-4">
                            {renderRightPanelContent()}
                        </div>
                    </aside>
                </div>


                <RoomFooter room={room} />
            </div>

            <ParticipantListSheet isOpen={isParticipantSheetOpen} onOpenChange={setIsParticipantSheetOpen} room={room} />
            <GameLobbyDialog 
                isOpen={isGameLobbyOpen} 
                onOpenChange={setIsGameLobbyOpen}
                roomId={roomId}
                participants={room?.participants || []}
            />
        </>
    );
}
