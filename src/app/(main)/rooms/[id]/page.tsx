// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import type { Room } from '@/lib/types';
import { Loader2, Mic, MicOff, Plus, Crown, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TextChat, { type Message } from '@/components/chat/text-chat';
import ChatMessageInput from '@/components/chat/ChatMessageInput';
import VoiceUserIcon from '@/components/voice/VoiceUserIcon';
import ParticipantListSheet from '@/components/rooms/ParticipantListSheet';
import RoomHeader from '@/components/rooms/RoomHeader';

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
        joinRoom, 
        leaveRoom,
        toggleSelfMute,
        participants: voiceParticipants,
    } = useVoiceChat();

    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    // Oda verisini dinle
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

    // Metin sohbeti mesajlarını dinle
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
    
    // Yeni mesaj geldiğinde sohbeti en alta kaydır
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
        if (!voiceParticipants || !room) {
            return { hostParticipant: null, otherParticipants: [] };
        }
        const host = voiceParticipants.find(p => p.uid === room.createdBy.uid);
        const others = voiceParticipants.filter(p => p.uid !== room.createdBy.uid);
        return { hostParticipant: host, otherParticipants: others };
    }, [voiceParticipants, room]);

    const isLoading = authLoading || !room;
    
    const showVoiceStageLoader = isConnecting;

    if (isLoading) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-gray-900">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const isRoomParticipant = room.participants?.some(p => p.uid === user?.uid);

    return (
        <>
            <div className="flex flex-col h-dvh bg-gray-900 text-gray-200">
                <RoomHeader 
                    room={room} 
                    isHost={isHost} 
                    onParticipantListToggle={() => setIsParticipantSheetOpen(true)}
                />

                {/* Voice Stage Area (Not scrollable) */}
                <div className="p-4 border-b border-gray-700/50 shrink-0">
                     {showVoiceStageLoader ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                     ) : (
                        <div className="space-y-4">
                            {/* Host Area */}
                            <div className="flex flex-col items-center justify-center min-h-28">
                                {hostParticipant ? (
                                    <VoiceUserIcon
                                        key={hostParticipant.uid}
                                        participant={hostParticipant}
                                        isHost={isHost}
                                        currentUserId={user!.uid}
                                        roomId={roomId}
                                        isParticipantTheHost={true}
                                        size="lg"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-gray-800/40 border-2 border-dashed border-gray-600">
                                            <Crown className="h-8 w-8 text-gray-600" />
                                        </div>
                                        <p className="text-xs font-semibold">Oda Sahibi</p>
                                    </div>
                                )}
                            </div>

                            {/* Other Participants Area */}
                            <div className="grid grid-cols-4 gap-4 text-center">
                                {Array.from({ length: 8 }).map((_, index) => {
                                    const participant = otherParticipants[index];
                                    if (participant) {
                                        return (
                                            <VoiceUserIcon
                                                key={participant.uid}
                                                participant={participant}
                                                isHost={isHost}
                                                currentUserId={user!.uid}
                                                roomId={roomId}
                                                isParticipantTheHost={false}
                                                size="sm"
                                            />
                                        );
                                    } else {
                                        return (
                                            <div key={`placeholder-${index}`} className="flex flex-col items-center justify-center aspect-square bg-gray-800/40 rounded-full">
                                                <Plus className="h-6 w-6 text-gray-600" />
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        </div>
                     )}
                </div>

                {/* Messages Area (Scrollable) */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4">
                    <TextChat messages={messages} loading={messagesLoading} />
                </div>

                {/* Footer / Input */}
                <footer className="flex items-center gap-3 p-3 border-t border-gray-700/50 bg-gray-900 shrink-0">
                    {isConnected ? (
                         <>
                            <Button onClick={handleToggleMute} variant="ghost" size="icon" className="rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                                {self?.isMuted ? <MicOff className="h-5 w-5 text-red-500"/> : <Mic className="h-5 w-5 text-white"/>}
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
