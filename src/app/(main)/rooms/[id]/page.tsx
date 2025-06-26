// src/app/(main)/rooms/[id]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute } from '@/lib/actions/voiceActions';
import type { Room } from '@/lib/types';
import { ChevronLeft, Loader2, MoreHorizontal, Mic, MicOff, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import TextChat, { type Message } from '@/components/chat/text-chat';
import ChatMessageInput from '@/components/chat/ChatMessageInput';
import VoiceUserIcon from '@/components/voice/VoiceUserIcon';
import { cn } from '@/lib/utils';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const roomId = params.id as string;
    
    const { user, loading: authLoading } = useAuth();
    const { participants, self, isConnected, isLoading: voiceLoading } = useVoiceChat(roomId);

    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isJoining, setIsJoining] = useState(true);

    const isHost = user?.uid === room?.createdBy.uid;

    // Oda verisini ve katılımcıları dinle
    useEffect(() => {
        if (!roomId) return;
        const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
            if (docSnap.exists()) {
                const roomData = { id: docSnap.id, ...docSnap.data() } as Room;
                setRoom(roomData);
                // Eğer kullanıcı odaya girmişse ve sesli sohbette değilse, otomatik olarak kat
                if (user && !isConnected && !voiceLoading) {
                    handleAutoJoinVoice(roomData);
                }
            } else {
                toast({ title: "Hata", description: "Oda bulunamadı.", variant: "destructive" });
                router.push('/rooms');
            }
        });
        return () => roomUnsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, user?.uid, isConnected, voiceLoading, router, toast]);
    
    // Sesli sohbete otomatik katıl
    const handleAutoJoinVoice = async (currentRoom: Room) => {
        if (!user || !currentRoom) return;
        
        const isParticipant = currentRoom.participants?.some(p => p.uid === user.uid);
        if(!isParticipant) return; // Odanın üyesi değilse katılma

        setIsJoining(true);
        try {
            await joinVoiceChat(roomId, {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
            });
        } catch (error: any) {
            toast({ title: "Sesli Sohbet Hatası", description: error.message, variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
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


    // Mikrofonu aç/kapat
    const handleToggleMute = async () => {
        if (!self || !user) return;
        if (!self.isSpeaker && self.isMuted) {
            toast({ variant: "destructive", title: "Dinleyici Modu", description: "Konuşmak için oda yöneticisinden izin istemelisiniz." });
            return;
        }
        await toggleSelfMute(roomId, user.uid, !self.isMuted);
    };

    const isLoading = authLoading || !room || (!isConnected && isJoining);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const hostParticipant = participants.find(p => p.uid === room.createdBy.uid);
    const otherParticipants = participants.filter(p => p.uid !== room.createdBy.uid);
    
    // Katıl butonunu göstermek için koşul
    const isRoomParticipant = room.participants?.some(p => p.uid === user?.uid);

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
            {/* Header */}
            <header className="flex items-center justify-between p-3 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="icon" className="rounded-full">
                        <Link href="/rooms"><ChevronLeft /></Link>
                    </Button>
                    <h1 className="text-md font-bold text-white truncate max-w-[180px]">{room.name}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                         <Users className="h-4 w-4 text-gray-400" />
                         <span>{participants.length}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreHorizontal />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Voice Stage */}
                <div className="grid grid-cols-4 gap-4 text-center">
                    {/* Boşluklar */}
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
                            />
                        ) : <div className="aspect-square"></div> }
                    </div>
                     <div className="col-span-1"></div>

                    {/* Diğer Katılımcılar ve Boş Slotlar */}
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
            </main>

            {/* Footer */}
            <footer className="flex items-center justify-between p-3 border-t border-gray-700/50">
                 <div className="flex items-center gap-2">
                    <Button onClick={handleToggleMute} variant="ghost" size="icon" className="rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                        {self?.isMuted ? <MicOff className="h-6 w-6 text-red-500"/> : <Mic className="h-6 w-6 text-white"/>}
                    </Button>
                 </div>
                 <Button onClick={() => setIsChatOpen(true)} className="rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-white font-semibold px-6">
                    Sohbet
                 </Button>
                 <div className="flex items-center gap-2">
                    {/* Placeholder for other buttons */}
                 </div>
            </footer>

            {/* Chat Sheet */}
            <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
                <SheetContent side="bottom" className="h-[85dvh] flex flex-col bg-gray-900 border-gray-700 text-white">
                    <SheetHeader className="text-center">
                        <SheetTitle>Sohbet</SheetTitle>
                        <SheetDescription className="text-gray-400">
                            {room.name} odası sohbeti
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto -mx-6">
                        <TextChat messages={messages} loading={messagesLoading} />
                    </div>
                    <SheetFooter className="pt-4 border-t border-gray-700 bg-gray-900 -mx-6 px-6 pb-2">
                        <ChatMessageInput roomId={roomId} canSendMessage={isRoomParticipant || false} />
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
