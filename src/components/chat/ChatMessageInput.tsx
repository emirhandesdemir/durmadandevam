// src/components/chat/ChatMessageInput.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ImagePlus, X, Camera, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Room } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { sendRoomMessage } from '@/lib/actions/roomActions';


interface ChatMessageInputProps {
  room: Room;
}

export default function ChatMessageInput({ room }: ChatMessageInputProps) {
  const { user: currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isParticipant = room.participants.some(p => p.uid === currentUser?.uid);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser || !userData || !isParticipant || isSending) return;

    setIsSending(true);
    
    try {
        await sendRoomMessage(room.id, {
            uid: currentUser.uid,
            displayName: userData.username,
            photoURL: userData.photoURL,
            selectedAvatarFrame: userData.selectedAvatarFrame,
            role: userData.role,
        }, message);
        
        setMessage('');

    } catch (error: any) {
        console.error("Mesaj gönderilirken hata: ", error);
        toast({
            title: "Hata",
            description: error.message || "Mesaj gönderilirken bir hata oluştu.",
            variant: "destructive"
        });
    } finally {
        setIsSending(false);
    }
  };

  if (!isParticipant) {
    return <p className="w-full text-center text-sm text-muted-foreground px-4">Mesaj göndermek için odaya katılmalısınız.</p>;
  }
  
  return (
    <div className='w-full'>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2 bg-muted rounded-full p-1.5">
            <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bir mesaj yaz... (+temizle, +duyuru)"
                autoComplete="off"
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={!message.trim() || isSending} className="rounded-full flex-shrink-0 h-9 w-9 bg-primary shadow-lg transition-transform hover:scale-110">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Gönder</span>
            </Button>
        </form>
    </div>
  );
}
