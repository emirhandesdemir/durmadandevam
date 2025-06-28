// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Loader2, Mic, MicOff, Plus, Crown, PhoneOff, ScreenShare, ScreenShareOff, ChevronsUpDown, Hash } from 'lucide-react';
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
import type { Room, ActiveGame, GameSettings, Channel } from '@/lib/types';
import GameCountdownCard from '@/components/game/GameCountdownCard';
import RoomGameCard from '@/components/game/RoomGameCard';
import { startGameInRoom, submitAnswer, endGameWithoutWinner, getGameSettings } from '@/lib/actions/gameActions';
import { cn } from '@/lib/utils';


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
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

    // --- Game State ---
    const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [gameLoading, setGameLoading] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Ref to hold the latest activeGame state to prevent stale closures in listeners
    const activeGameRef = useRef(activeGame);
    useEffect(() => {
        activeGameRef.current = activeGame;
    }, [activeGame]);

    const isHost = user?.uid === room?.createdBy.uid;

    const screenSharer = useMemo(() => participants.find(p => p.isSharingScreen), [participants]);
    const remoteScreenStream = screenSharer && !isSharingScreen ? remoteScreenStreams[screenSharer.uid] : null;

    useEffect(() => {
        if (roomId) setActiveRoomId(roomId);
        return () => setActiveRoomId(null);
    }, [roomId, setActiveRoomId]);

    useEffect(() => {
        getGameSettings().then(setGameSettings);
    }, []);

    // Oda verisini dinle
    useEffect(() => {
        if (!roomId) return;
        
        const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists()) {
                 const roomData = { id: docSnap.id, ...docSnap.data() } as Room;
                 setRoom(roomData);
                 if (roomData.type === 'server' && roomData.channels && !selectedChannelId) {
                     setSelectedChannelId(roomData.channels[0].id);
                 }
            } else {
                 toast({ variant: 'destructive', title: 'Oda Bulunamadı', description: 'Bu oda artık mevcut değil veya süresi dolmuş.' });
                 router.push('/rooms');
            }
        });

        return () => { roomUnsub(); };
    }, [roomId, router, toast, selectedChannelId]);
    
    // Mesajları dinle
    useEffect(() => {
        if (!roomId) return;
        // Sunucu ise ve kanal seçilmemişse dinlemeyi başlatma
        if (room?.type === 'server' && !selectedChannelId) {
            setMessagesLoading(false);
            return;
        }

        setMessagesLoading(true);

        const messagePath = room?.type === 'server'
            ? collection(db, "rooms", roomId, "channels", selectedChannelId!, "messages")
            : collection(db, "rooms", roomId, "messages");
            
        const messagesQuery = query(messagePath, orderBy("createdAt", "asc"), limit(100));
        const messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            setMessagesLoading(false);
        });

        return () => { messagesUnsub(); };
    }, [roomId, room?.type, selectedChannelId]);


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

    const isLoading = authLoading || !room;
    const isRoomParticipant = room?.participants?.some(p => p.uid === user?.uid);

    if (isLoading) {
        return <div className="flex h-full items-center justify-center bg-gray-900"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    // --- RENDER FUNCTIONS ---

    const renderRoomUI = () => (
         <div className="flex flex-col h-full bg-gray-900 text-gray-200">
            <RoomHeader 
                room={room!} 
                isHost={isHost} 
                onParticipantListToggle={() => setIsParticipantSheetOpen(true)}
                onBackClick={() => setShowExitDialog(true)}
            />
            
            <div className="p-4 shrink-0">
                <p className="text-center text-xs text-muted-foreground">Bu bir Hızlı Oda. Sesli sohbet ve oyun odaklıdır.</p>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
                <TextChat messages={messages} loading={messagesLoading} />
            </div>

            <footer className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent pointer-events-none">
                <div className="flex items-center gap-2 p-2 bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-700/50 pointer-events-auto">
                    <ChatMessageInput roomId={roomId} canSendMessage={isRoomParticipant || false} />
                </div>
            </footer>
        </div>
    );
    
    const renderServerUI = () => (
        <div className="flex h-full bg-gray-900 text-gray-200">
            {/* Channel Sidebar */}
            <div className="w-72 bg-gray-800/50 flex-col p-2 hidden md:flex">
                <div className="p-2 mb-2">
                    <h1 className="font-bold text-lg truncate">{room?.name}</h1>
                    <p className="text-xs text-muted-foreground truncate">{room?.description}</p>
                </div>
                <div className="flex-1 space-y-1">
                     <p className="px-2 py-1 text-xs font-bold uppercase text-muted-foreground">Metin Kanalları</p>
                    {room?.channels?.map(channel => (
                        <button key={channel.id} onClick={() => setSelectedChannelId(channel.id)} className={cn("w-full text-left flex items-center gap-2 p-2 rounded-md transition-colors", selectedChannelId === channel.id ? "bg-primary/20 text-white" : "text-gray-400 hover:bg-gray-700/50 hover:text-white")}>
                            <Hash className="h-5 w-5"/>
                            <span className="font-medium truncate">{channel.name}</span>
                        </button>
                    ))}
                </div>
                 <div className="p-2 border-t border-gray-700/50 flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL || undefined} />
                        <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold truncate">{user?.displayName}</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                 <RoomHeader 
                    room={room!} 
                    isHost={isHost} 
                    onParticipantListToggle={() => setIsParticipantSheetOpen(true)}
                    onBackClick={() => router.push('/rooms')}
                />
                 <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
                    <TextChat messages={messages} loading={messagesLoading} />
                 </div>
                 <footer className="fixed bottom-0 left-0 md:left-72 right-0 p-3 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent pointer-events-none">
                    <div className="flex items-center gap-2 p-2 bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-700/50 pointer-events-auto">
                        <ChatMessageInput roomId={roomId} channelId={selectedChannelId!} canSendMessage={isRoomParticipant || false} />
                    </div>
                </footer>
            </div>
        </div>
    );

    return (
        <>
            {room?.type === 'server' ? renderServerUI() : renderRoomUI()}
            <ParticipantListSheet isOpen={isParticipantSheetOpen} onOpenChange={setIsParticipantSheetOpen} participants={room?.participants || []} />
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Odadan Ayrıl</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ne yapmak istersiniz? Odayı arka plana alabilir veya sesli sohbetten tamamen ayrılabilirsiniz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                         <Button variant="outline" onClick={() => { router.push('/rooms'); setShowExitDialog(false); }}>
                            Arka Plana Al
                        </Button>
                        <Button onClick={() => { handleLeaveAndNavigate(); setShowExitDialog(false); }}>
                            Ayrıl ve Kapat
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
