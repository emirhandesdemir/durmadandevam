// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import type { Room } from '@/lib/types';
import { Loader2, Mic, MicOff, Plus, Crown, PhoneOff, ScreenShare, ScreenShareOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TextChat, { type Message } from '@/components/chat/text-chat';
import ChatMessageInput from '@/components/chat/ChatMessageInput';
import VoiceUserIcon from '@/components/voice/VoiceUserIcon';
import ParticipantListSheet from '@/components/rooms/ParticipantListSheet';
import RoomHeader from '@/components/rooms/RoomHeader';
import ScreenShareView from '@/components/voice/ScreenShareView';


export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    const { user, loading: authLoading } = useAuth();
    const { 
        self, 
        isConnecting, 
        isConnected, 
        isSharingScreen,
        localScreenStream,
        remoteScreenStreams,
        startScreenShare,
        stopScreenShare,
        joinRoom, 
        leaveRoom,
        toggleSelfMute,
        participants,
    } = useVoiceChat();

    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    const screenSharer = useMemo(() => participants.find(p => p.isSharingScreen), [participants]);
    const remoteScreenStream = screenSharer && !isSharingScreen ? remoteScreenStreams[screenSharer.uid] : null;

    useEffect(() => {
        if (!roomId) return;
        const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists()) {
                const roomData = { id: docSnap.id, ...docSnap.data() } as Room;
                setRoom(roomData);
            } else {
                toast({ title: "Oda Kapatıldı", description: "Bu oda artık mevcut değil.", variant: "destructive" });
                router.push('/rooms');
            }
        });
        return () => roomUnsub();
    }, [roomId, router, toast]);

    useEffect(() => {
        if (!roomId) return;
        setMessagesLoading(true);
        const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"), limit(100));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs: Message[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setMessagesLoading(false);
        }, (error) => {
            console.error("Mesajlar alınırken hata:", error);
            setMessagesLoading(false);
        });
        return () => unsubscribe();
    }, [roomId]);
    
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages]);
    
    const handleJoinVoice = async () => {
        if (!user || !room) return;
        await joinRoom(room);
    };

    const handleToggleMute = async () => {
        if (!self || !user) return;
        await toggleSelfMute();
    };
    
    const { hostParticipant, otherParticipants } = useMemo(() => {
        if (!participants || !room) {
            return { hostParticipant: null, otherParticipants: [] };
        }
        const host = participants.find(p => p.uid === room.createdBy.uid);
        const others = participants.filter(p => p.uid !== room.createdBy.uid);
        return { hostParticipant: host, otherParticipants: others };
    }, [participants, room]);

    const isLoading = authLoading || !room;
    const showVoiceStageLoader = isConnecting && !isConnected;
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
                />
                
                <div className="p-4 border-b border-gray-700/50 shrink-0">
                    {screenSharer ? (
                        <div className='animate-in fade-in duration-300'>
                            {isSharingScreen && localScreenStream && <ScreenShareView stream={localScreenStream} />}
                            {remoteScreenStream && <ScreenShareView stream={remoteScreenStream} />}
                            <p className="text-center text-xs text-muted-foreground mt-2">{screenSharer.username} ekranını paylaşıyor...</p>
                        </div>
                    ) : showVoiceStageLoader ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-4">
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
                    )}
                </div>

                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4">
                    <TextChat messages={messages} loading={messagesLoading} />
                </div>

                <footer className="flex items-center gap-3 p-3 border-t border-gray-700/50 bg-gray-900 shrink-0">
                    {isConnected ? (
                         <>
                            <Button onClick={handleToggleMute} variant="ghost" size="icon" className="rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                                {self?.isMuted ? <MicOff className="h-5 w-5 text-red-500"/> : <Mic className="h-5 w-5 text-white"/>}
                            </Button>
                             <Button onClick={isSharingScreen ? stopScreenShare : startScreenShare} variant="ghost" size="icon" className="rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                                {isSharingScreen ? <ScreenShareOff className="h-5 w-5 text-red-500"/> : <ScreenShare className="h-5 w-5 text-white"/>}
                             </Button>
                             <Button onClick={() => leaveRoom()} variant="destructive" size="icon" className="rounded-full">
                                <PhoneOff className="h-5 w-5" />
                                <span className="sr-only">Ayrıl</span>
                            </Button>
                        </>
                    ) : (
                         <Button onClick={handleJoinVoice} disabled={isConnecting || !isRoomParticipant} className="rounded-full bg-primary text-primary-foreground h-10 px-4">
                            {isConnecting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Mic className="h-5 w-5"/>}
                            <span className="ml-2">Katıl</span>
                         </Button>
                    )}
                    <ChatMessageInput roomId={roomId} canSendMessage={isRoomParticipant || false} />
                </footer>
            </div>
             <ParticipantListSheet
                isOpen={isParticipantSheetOpen}
                onOpenChange={setIsParticipantSheetOpen}
                participants={room.participants || []}
            />
        </>
    );
}
