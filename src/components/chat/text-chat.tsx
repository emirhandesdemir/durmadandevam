"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TextChatProps {
  roomId: string;
  canSendMessage: boolean;
}

interface Message {
  id: string;
  uid: string;
  username: string;
  photoURL?: string | null;
  text: string;
  type?: 'system' | 'user';
  createdAt: Timestamp;
}

export default function TextChat({ roomId, canSendMessage }: TextChatProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    // En son 50 mesajı dinle
    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"), limit(50));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Yeni mesaj geldiğinde en alta kaydır
  useEffect(() => {
     if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === '' || !currentUser || !canSendMessage) return;

    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        uid: currentUser.uid,
        username: currentUser.displayName || 'Anonim',
        photoURL: currentUser.photoURL,
        text: message,
        createdAt: serverTimestamp(),
        type: 'user',
      });
      setMessage('');
    } catch (error) {
        console.error("Error sending message: ", error);
        toast({
            title: "Hata",
            description: "Mesaj gönderilirken bir hata oluştu.",
            variant: "destructive"
        })
    }
  };
  
  if (!currentUser) return null;

  return (
    <div className="h-full flex flex-col bg-card rounded-lg shadow-sm">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-6 p-4 md:p-6">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!loading && messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                  Sohbeti başlatmak için bir mesaj gönderin!
              </div>
          )}

          {messages.map(msg => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center text-xs text-muted-foreground italic my-4">
                  <span>{msg.text}</span>
                  <span className="ml-2">
                    {msg.createdAt ? format(msg.createdAt.toDate(), 'p', { locale: tr }) : ''}
                  </span>
                </div>
              )
            }

            const isCurrentUser = msg.uid === currentUser.uid;
            return (
              <div key={msg.id} className={cn("flex items-start gap-3 w-full", isCurrentUser && "flex-row-reverse")}>
                <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.photoURL || undefined} />
                    <AvatarFallback>{msg.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={cn("flex flex-col gap-1 max-w-xs md:max-w-md", isCurrentUser && "items-end")}>
                    <div className="flex items-center gap-2">
                       <p className="font-semibold text-sm">{isCurrentUser ? "Siz" : msg.username}</p>
                       <p className="text-xs text-muted-foreground">
                         {msg.createdAt ? format(msg.createdAt.toDate(), 'p', { locale: tr }) : ''}
                       </p>
                    </div>
                    <div className={cn(
                        "p-3 rounded-lg",
                        isCurrentUser 
                          ? "bg-primary text-primary-foreground rounded-br-none" 
                          : "bg-secondary rounded-bl-none"
                    )}>
                        <p className="text-sm break-words">{msg.text}</p>
                    </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        {canSendMessage ? (
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bir mesaj yaz..."
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={!message.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Gönder</span>
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Mesaj göndermek için odaya katılmalısınız.</p>
        )}
      </div>
    </div>
  );
}
