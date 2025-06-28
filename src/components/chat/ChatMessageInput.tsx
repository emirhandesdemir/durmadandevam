// src/components/chat/ChatMessageInput.tsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessageInputProps {
  roomId: string;
  channelId?: string; // Optional channelId for servers
  canSendMessage: boolean;
}

export default function ChatMessageInput({ roomId, channelId, canSendMessage }: ChatMessageInputProps) {
  const { user: currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === '' || !currentUser || !canSendMessage || isSending) return;

    setIsSending(true);
    const textToSend = message;
    setMessage('');

    try {
        const messagePath = channelId 
            ? collection(db, "rooms", roomId, "channels", channelId, "messages")
            : collection(db, "rooms", roomId, "messages");
        
        await addDoc(messagePath, {
            uid: currentUser.uid,
            username: currentUser.displayName || 'Anonim',
            photoURL: currentUser.photoURL,
            text: textToSend,
            createdAt: serverTimestamp(),
            type: 'user',
            selectedBubble: userData?.selectedBubble || '',
            selectedAvatarFrame: userData?.selectedAvatarFrame || '',
        });
    } catch (error: any) {
        console.error("Mesaj gönderilirken hata: ", error);
        toast({
            title: "Hata",
            description: error.message || "Mesaj gönderilirken bir hata oluştu.",
            variant: "destructive"
        });
        setMessage(textToSend);
    } finally {
        setIsSending(false);
    }
  };

  if (!canSendMessage) {
    return <p className="w-full text-center text-sm text-muted-foreground px-4">Mesaj göndermek için topluluğa katılmalısınız.</p>;
  }
  
  return (
    <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Bir mesaj yaz..."
        autoComplete="off"
        className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
        disabled={isSending}
      />
      <Button type="submit" size="icon" disabled={!message.trim() || isSending} className="rounded-full flex-shrink-0 h-9 w-9 bg-primary shadow-lg transition-transform hover:scale-110">
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        <span className="sr-only">Gönder</span>
      </Button>
    </form>
  );
}
