// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import type { Room } from '@/lib/types';
import { ChevronLeft, Loader2, MoreHorizontal, Mic, MicOff, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TextChat, { type Message } from '@/components/chat/text-chat';
import ChatMessageInput from '@/components/chat/ChatMessageInput';
import VoiceUserIcon from '@/components/voice/VoiceUserIcon';
import ParticipantListSheet from '@/components/rooms/ParticipantListSheet';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    const { user, loading: authLoading } = useAuth();
    const { 
        participants, 
        self, 
        isConnecting, 
        isConnected, 
        joinRoom, 
        toggleSelfMute 
    } = useVoiceChat();

    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isParticipantSheetOpen, setIsParticipantSheetOpen] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const isHost = user?.uid === room?.createdBy.uid;

    // Oda verisini dinle
    useEffect(() => {
        if (!roomId) return;
        const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists()) {
                const roomData = { id: docSnap.id, ...docSnap.data() } as Room;
                setRoom(roomData);
            } else {
                toast({ title: "Hata", description: "Oda bulunamadı.", variant: "destructive" });
                router.push('/rooms');
            }
        });
        return () => roomUnsub();
    }, [roomId, router, toast]);

    const handleJoinVoice = async () => {
        if (!user || !room) return;
        
        const isAlreadyInRoom = room.participants?.some(p => p.uid === user.uid);
        if(!isAlreadyInRoom) {
             toast({ title: "Hata", description: "Önce odaya katılmalısınız.", variant: "destructive" });
             return;
        }

        await joinRoom(room);
    };
    
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
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleToggleMute = async () => {
        if (!self || !user) return;
        if (!self.isSpeaker && self.isMuted) {
            toast({ variant: "destructive", title: "Dinleyici Modu", description: "Konuşmak için oda yöneticisinden izin istemelisiniz." });
            return;
        }
        await toggleSelfMute();
    };

    const isLoading = authLoading || !room;

    if (isLoading) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-gray-900">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const hostParticipant = participants.find(p => p.uid === room.createdBy.uid);
    const otherParticipants = participants.filter(p => p.uid !== room.createdBy.uid);
    const isRoomParticipant = room.participants?.some(p => p.uid === user?.uid);

    return (
        <>
            <div className="flex flex-col h-dvh bg-gray-900 text-gray-200">
                {/* Header */}
                <header className="flex items-center justify-between p-3 border-b border-gray-700/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="icon" className="rounded-full">
                            <Link href="/rooms"><ChevronLeft /></Link>
                        </Button>
                        <h1 className="text-md font-bold text-white truncate max-w-[180px]">{room.name}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                         <Button variant="ghost" className="flex items-center gap-1.5 text-sm font-semibold p-2" onClick={() => setIsParticipantSheetOpen(true)}>
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{room.participants?.length || 0}</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreHorizontal />
                        </Button>
                    </div>
                </header>

                {/* Voice Stage */}
                <div className="p-4 space-y-4 shrink-0">
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="col-span-1"></div>
                        <div className="col-span-2">
                            {hostParticipant ? (
                                <VoiceUserIcon
                                    key={hostParticipant.uid}
                                    participant={hostParticipant}
                                    isHost={isHost}
                                    currentUserId={user!.uid}
                                    roomId={roomId}
                                    size="lg"
                                    isParticipantTheHost={true}
                                />
                            ) : <div className="aspect-square"></div> }
                        </div>
                        <div className="col-span-1"></div>
                        {Array.from({ length: 8 }).map((_, index) => {
                            const participant = otherParticipants[index];
                            return (
                                <div key={index}>
                                    {participant ? (
                                        <VoiceUserIcon
                                            participant={participant}
                                            isHost={isHost}
                                            currentUserId={user!.uid}
                                            roomId={roomId}
                                            isParticipantTheHost={false}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center aspect-square bg-gray-800/40 rounded-full">
                                            <Plus className="h-6 w-6 text-gray-600" />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Chat Messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
                    <TextChat messages={messages} loading={messagesLoading} />
                </div>

                {/* Footer / Input */}
                <footer className="flex items-center gap-3 p-3 border-t border-gray-700/50 bg-gray-900 shrink-0">
                    {isConnected ? (
                        <Button onClick={handleToggleMute} variant="ghost" size="icon" className="rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                            {self?.isMuted ? <MicOff className="h-5 w-5 text-red-500"/> : <Mic className="h-5 w-5 text-white"/>}
                        </Button>
                    ) : (
                         <Button onClick={handleJoinVoice} disabled={isConnecting} className="rounded-full bg-primary text-primary-foreground h-10 px-4">
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
