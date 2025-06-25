// src/components/chat/text-chat.tsx
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

/**
 * TextChat Bileşeni
 * 
 * Bir oda içindeki gerçek zamanlı metin sohbetini yönetir.
 * - Firestore'dan mesajları dinler ve anlık olarak günceller.
 * - Kullanıcıların mesaj göndermesini sağlar.
 * - Sistem mesajlarını (örn: "X katıldı") farklı bir stilde gösterir.
 * - Yeni mesaj geldiğinde otomatik olarak aşağı kayar.
 * - Sadece odaya katılmış kullanıcıların mesaj göndermesine izin verir.
 */

// Mesaj verisinin arayüzü
interface Message {
  id: string;
  uid: string;
  username: string;
  photoURL?: string | null;
  text: string;
  type?: 'system' | 'user'; // Mesaj türü: kullanıcı veya sistem
  createdAt: Timestamp;
}

interface TextChatProps {
  roomId: string;
  canSendMessage: boolean; // Kullanıcının mesaj gönderip gönderemeyeceğini belirler
}

export default function TextChat({ roomId, canSendMessage }: TextChatProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Firestore'dan mesajları dinle
  useEffect(() => {
    if (!roomId) return;

    // 'messages' alt koleksiyonuna sorgu oluştur, son 50 mesajı al
    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"), limit(50));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Yeni mesaj geldiğinde sohbeti en alta kaydır
  useEffect(() => {
     if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  // Mesaj gönderme fonksiyonu
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    // Boş mesaj veya yetkisiz kullanıcı kontrolü
    if (message.trim() === '' || !currentUser || !canSendMessage) return;

    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        uid: currentUser.uid,
        username: currentUser.displayName || 'Anonim',
        photoURL: currentUser.photoURL,
        text: message,
        createdAt: serverTimestamp(),
        type: 'user', // Mesaj tipi kullanıcı
      });
      setMessage(''); // Input'u temizle
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
    <div className="h-full flex flex-col">
      {/* Mesajların listelendiği alan */}
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
        <div className="space-y-6 p-4">
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

          {messages.map((msg) => {
            // Sistem mesajlarını farklı bir stilde göster
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center text-xs text-muted-foreground italic my-4 animate-in fade-in">
                  <span>{msg.text}</span>
                </div>
              )
            }

            const isCurrentUser = msg.uid === currentUser.uid;
            return (
              <div key={msg.id} className={cn("flex items-end gap-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-500", isCurrentUser && "flex-row-reverse")}>
                <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.photoURL || undefined} />
                    <AvatarFallback>{msg.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={cn("flex flex-col gap-1 max-w-[70%]", isCurrentUser && "items-end")}>
                    <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                       <p className="font-bold text-sm">{isCurrentUser ? "Siz" : msg.username}</p>
                       <p className="text-xs text-muted-foreground">
                         {msg.createdAt ? format(msg.createdAt.toDate(), 'p', { locale: tr }) : ''}
                       </p>
                    </div>
                    {/* Sohbet balonu */}
                    <div className={cn(
                        "p-3 rounded-2xl shadow-md",
                        isCurrentUser 
                          ? "bg-primary text-primary-foreground rounded-br-lg" 
                          : "bg-card text-card-foreground rounded-bl-lg border"
                    )}>
                        <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                    </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
      {/* Mesaj gönderme input'u */}
      <div className="p-4 bg-background/80 backdrop-blur-sm border-t sticky bottom-0">
        {canSendMessage ? (
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-3">
            <Input 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bir mesaj yaz..."
              autoComplete="off"
              className="rounded-full flex-1 py-5 focus-visible:ring-offset-0 focus-visible:ring-2"
            />
            <Button type="submit" size="icon" disabled={!message.trim()} className="rounded-full flex-shrink-0 h-10 w-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-transform hover:scale-110">
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
