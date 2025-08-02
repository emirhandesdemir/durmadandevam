// src/components/live/LiveChat.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import type { LiveSession, Message, UserProfile } from '@/lib/types';
import { User } from 'firebase/auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Send, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import LiveGiftPanel from './LiveGiftPanel';
import { sendLiveChatMessage } from '@/lib/actions/liveActions';
import { getGiftById } from '@/lib/gifts';

interface LiveChatProps {
    session: LiveSession;
    messages: Message[];
    user: User | null;
    userData: UserProfile | null;
}

const LiveChatMessage = ({ message }: { message: Message }) => {
    if (message.type === 'gift' && message.giftData) {
        const gift = getGiftById(message.giftData.giftId);
        if (!gift) return null;
        const GiftIcon = gift.icon;
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-400/20 text-sm">
                <GiftIcon className="h-5 w-5 text-yellow-500"/>
                <p><strong className="font-semibold text-primary">{message.giftData.senderName}</strong> bir <strong className="text-yellow-400">{gift.name}</strong> gönderdi!</p>
            </div>
        )
    }
    return (
        <div className="flex items-start gap-2 p-1.5 rounded-md">
            <Avatar className="h-6 w-6">
                <AvatarImage src={message.photoURL || undefined} />
                <AvatarFallback className="text-xs">{message.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <span className="font-semibold text-sm mr-2">{message.username}</span>
                <span className="text-sm">{message.text}</span>
            </div>
        </div>
    )
}

export default function LiveChat({ session, messages, user, userData }: LiveChatProps) {
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isGiftPanelOpen, setIsGiftPanelOpen] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user || !userData) return;
        setIsSending(true);
        try {
            await sendLiveChatMessage(session.id, user.uid, userData.username, input);
            setInput('');
        } catch (error) {
            console.error("Mesaj gönderilemedi:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <div className="relative z-10 flex-1 flex flex-col p-4 text-white">
                <header className="flex justify-between items-start">
                    <div className="flex items-center gap-3 p-2 rounded-full bg-black/40">
                         <Avatar className="h-10 w-10">
                            <AvatarImage src={session.hostPhotoURL || undefined} />
                            <AvatarFallback>{session.hostUsername.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-bold">{session.hostUsername}</h2>
                            <p className="text-xs">{session.title}</p>
                        </div>
                    </div>
                     <div className="p-2 rounded-full bg-black/40 flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span>{session.viewerCount}</span>
                    </div>
                </header>
                
                <div className="flex-1" />

                <div className="flex flex-col justify-end h-1/2">
                    <ScrollArea className="h-full" ref={scrollAreaRef}>
                        <div className="flex flex-col gap-2">
                           {messages.map((msg, index) => <LiveChatMessage key={index} message={msg} />)}
                        </div>
                    </ScrollArea>
                </div>

                <footer className="mt-4">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <Input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Sohbete katıl..."
                            className="bg-black/40 border-white/20 rounded-full h-12 text-white placeholder:text-white/60"
                        />
                         <Button type="button" size="icon" className="rounded-full h-12 w-12 bg-black/40 border-white/20 hover:bg-black/60" onClick={() => setIsGiftPanelOpen(true)}>
                            <Gift className="h-6 w-6 text-yellow-400" />
                        </Button>
                        <Button type="submit" size="icon" className="rounded-full h-12 w-12" disabled={isSending || !input.trim()}>
                           {isSending ? <Loader2 className="animate-spin"/> : <Send/>}
                        </Button>
                    </form>
                </footer>
            </div>
            <LiveGiftPanel
                isOpen={isGiftPanelOpen}
                onOpenChange={setIsGiftPanelOpen}
                liveId={session.id}
                hostId={session.hostId}
            />
        </>
    )
}
