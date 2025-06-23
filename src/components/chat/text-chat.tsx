"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';

interface TextChatProps {
  roomId: string;
}

interface Message {
  id: string;
  text: string;
  sender: {
    name: string;
    uid: string;
    photoURL?: string | null;
  };
  createdAt: Timestamp;
}

export default function TextChat({ roomId }: TextChatProps) {
  const { user: currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [roomId]);

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
    if (message.trim() === '' || !currentUser) return;

    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        text: message,
        createdAt: serverTimestamp(),
        sender: {
          uid: currentUser.uid,
          name: currentUser.displayName || 'Anonim',
          photoURL: currentUser.photoURL,
        }
      });
      setMessage('');
    } catch (error) {
        console.error("Error sending message: ", error);
    }
  };
  
  if (!currentUser) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Metin Sohbeti</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="space-y-4 p-6">
            {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    Sohbeti başlatmak için bir mesaj gönderin!
                </div>
            )}

            {messages.map(msg => {
              const isCurrentUser = msg.sender.uid === currentUser.uid;
              return (
                <div key={msg.id} className={cn("flex items-start gap-3", isCurrentUser && "flex-row-reverse")}>
                  <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.sender.photoURL || undefined} />
                      <AvatarFallback>{msg.sender.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className={cn("flex flex-col", isCurrentUser && "items-end")}>
                      <p className="font-semibold text-sm">{isCurrentUser ? "Siz" : msg.sender.name}</p>
                      <div className={cn(
                          "p-3 rounded-lg max-w-xs md:max-w-md",
                          isCurrentUser 
                            ? "bg-primary text-primary-foreground rounded-br-none" 
                            : "bg-secondary rounded-tl-none"
                      )}>
                          <p className="text-sm break-words">{msg.text}</p>
                      </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bir mesaj yaz..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
