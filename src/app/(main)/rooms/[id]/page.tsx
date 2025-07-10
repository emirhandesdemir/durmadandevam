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

import type { Room, Message, Giveaway, ActiveGameSession, MindWarSession } from '@/lib/types';
import RoomFooter from '@/components/rooms/RoomFooter';
import SpeakerLayout from '@/components/rooms/SpeakerLayout';
import RoomInfoCards from '@/components/rooms/RoomInfoCards';
import GameResultCard from '@/components/game/GameResultCard';
import GiveawayCard from '@/components/rooms/GiveawayCard';
import { cn } from '@/lib/utils';
import GiveawayDialog from '@/components/rooms/GiveawayDialog';

// Import new game components and actions
import GameLobbyDialog from '@/components/game/GameLobbyDialog';
import ActiveGameArea from '@/components/game/ActiveGameArea';
import MindWarLobby from '@/components/games/mindwar/MindWarLobby';
import MindWarMainUI from '@/components/games/mindwar/MindWarMainUI';


export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    // --- Auth & Contexts ---
    const { user, userData, featureFlags, loading: authLoading } = useAuth();
    const { setActiveRoomId } = useVoiceChat();

    // --- Component State ---
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const [isSpeakerLayoutCollapsed, setIsSpeakerLayoutCollapsed] = useState(false);
    const [isGiveawayDialogOpen, setIsGiveawayDialogOpen] = useState(false);
    const [isGameLobbyOpen, setIsGameLobbyOpen] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    
    // Game State
    const [finishedGame, setFinishedGame] = useState<any>(null);
    const [activeGameSession, setActiveGameSession] = useState<ActiveGameSession | null>(null);
    const [activeMindWarSession, setActiveMindWarSession] = useState<MindWarSession | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;

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
        
        // Listener for new interactive game sessions
        const gameSessionUnsub = onSnapshot(query(collection(db, 'rooms', roomId, 'game_sessions'), where('status', '!=', 'finished'), limit(1)), (snapshot) => {
            setActiveGameSession(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ActiveGameSession);
        });

        // Listener for Mind Wars sessions
        const mindWarSessionUnsub = onSnapshot(query(collection(db, 'rooms', roomId, 'mindWarSessions'), where('status', '!=', 'finished'), limit(1)), (snapshot) => {
            setActiveMindWarSession(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MindWarSession);
        });
        
        return () => { roomUnsub(); messagesUnsub(); gameSessionUnsub(); mindWarSessionUnsub(); };
    }, [roomId, router, toast]);
    
    // Auto-scroll chat
    useEffect(() => {
        if (chatScrollRef.current) { chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }
    }, [messages]);
    
    const isLoading = authLoading || !room;
    if (isLoading) return <div className="flex h-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

    const renderGameContent = () => {
        if (activeMindWarSession && user && userData) {
             return <MindWarMainUI session={activeMindWarSession} currentUser={{uid: user.uid, username: userData.username, photoURL: userData.photoURL || null}} roomId={roomId} />;
        }
        if (activeGameSession && user) {
            return <ActiveGameArea game={activeGameSession} roomId={roomId} currentUser={{uid: user.uid, username: userData?.username || 'Biri'}} />
        }
        if (finishedGame) {
            return <GameResultCard game={finishedGame} />;
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
                    {gameContent && (
                        <div className="p-4">
                            {gameContent}
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
