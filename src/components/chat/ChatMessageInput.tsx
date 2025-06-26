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
  canSendMessage: boolean;
}

export default function ChatMessageInput({ roomId, canSendMessage }: ChatMessageInputProps) {
  const { user: currentUser } = useAuth();
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
        await addDoc(collection(db, "rooms", roomId, "messages"), {
            uid: currentUser.uid,
            username: currentUser.displayName || 'Anonim',
            photoURL: currentUser.photoURL,
            text: textToSend,
            createdAt: serverTimestamp(),
            type: 'user',
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
    return <p className="text-center text-sm text-gray-400">Mesaj göndermek için odaya katılmalısınız.</p>;
  }
  
  return (
    <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-3">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Bir mesaj yaz..."
        autoComplete="off"
        className="rounded-full flex-1 py-5 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-primary"
        disabled={isSending}
      />
      <Button type="submit" size="icon" disabled={!message.trim() || isSending} className="rounded-full flex-shrink-0 h-10 w-10 bg-primary shadow-lg transition-transform hover:scale-110">
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        <span className="sr-only">Gönder</span>
      </Button>
    </form>
  );
}
