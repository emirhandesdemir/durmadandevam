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
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';


interface ChatMessageInputProps {
  room: Room;
  isExpanded: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

export default function ChatMessageInput({ room, isExpanded, onFocus, onBlur }: ChatMessageInputProps) {
  const { user: currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isParticipant = room.participants.some(p => p.uid === currentUser?.uid);
  const isEventRoom = room.type === 'event';

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (inputRef.current && !inputRef.current.parentElement?.contains(target)) {
            onBlur();
        }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onBlur]);


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
        onBlur(); // Collapse after sending

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
    <motion.div layout transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="flex-1">
        <form onSubmit={handleSendMessage} className={cn("flex w-full items-center space-x-2 p-1 transition-all duration-300", isEventRoom ? "bg-black/40 rounded-full" : "bg-muted rounded-full")}>
            <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={onFocus}
                placeholder="Bir mesaj yaz..."
                autoComplete="off"
                className={cn("flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground", isEventRoom && "placeholder:text-white/70 text-white")}
                disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={!message.trim() || isSending} className="rounded-full flex-shrink-0 h-9 w-9 bg-primary shadow-lg transition-transform hover:scale-110">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Gönder</span>
            </Button>
        </form>
    </motion.div>
  );
}
