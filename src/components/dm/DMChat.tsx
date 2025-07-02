// src/components/dm/DMChat.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, DirectMessage } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, Video, Phone } from 'lucide-react';
import NewMessageInput from './NewMessageInput';
import MessageBubble from './MessageBubble';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { initiateCall } from '@/lib/actions/callActions';
import { useRouter } from 'next/navigation';
import CallStatusMessage from './CallStatusMessage';


interface DMChatProps {
  chatId: string;
  partner: UserProfile;
}

/**
 * Belirli bir kullanıcı ile olan sohbetin arayüzünü oluşturur.
 */
export default function DMChat({ chatId, partner }: DMChatProps) {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Mesajları gerçek zamanlı olarak dinle
    const messagesRef = collection(db, 'directMessages', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectMessage));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Mesajlar alınırken hata:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    // Yeni mesaj geldiğinde en alta kaydır
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleInitiateCall = async (type: 'video' | 'audio') => {
    if (!user || !userData || !partner) return;
    setIsCalling(true);
    try {
      const callId = await initiateCall(
        { uid: user.uid, username: userData.username, photoURL: userData.photoURL },
        { uid: partner.uid, username: partner.username, photoURL: partner.photoURL },
        type
      );
      router.push(`/call/${callId}`);
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message || "Arama başlatılamadı." });
      setIsCalling(false);
    }
  }


  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
  if (!user || !userData) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-3 border-b shrink-0">
        <Button asChild variant="ghost" size="icon" className="md:hidden rounded-full">
            <Link href="/dm"><ChevronLeft /></Link>
        </Button>
        <Link href={`/profile/${partner.uid}`} className="flex items-center gap-3">
            <div className="relative">
                <div className={cn("avatar-frame-wrapper", partner.selectedAvatarFrame)}>
                    <Avatar className="relative z-[1]">
                        <AvatarImage src={partner.photoURL || undefined} />
                        <AvatarFallback>{partner.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                {partner.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" aria-label="Çevrimiçi" />
                )}
            </div>
            <div>
                <h2 className="font-bold text-lg">{partner.username}</h2>
                <p className="text-xs text-muted-foreground">
                    {partner.isOnline 
                        ? <span className="text-green-500 font-semibold">Çevrimiçi</span>
                        : partner.lastSeen 
                            ? `Son görülme: ${formatDistanceToNow((partner.lastSeen as Timestamp).toDate(), { addSuffix: true, locale: tr })}`
                            : 'Çevrimdışı'
                    }
                </p>
            </div>
        </Link>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleInitiateCall('audio')} disabled={isCalling}>
            <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleInitiateCall('video')} disabled={isCalling}>
            {isCalling ? <Loader2 className="h-5 w-5 animate-spin"/> : <Video className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mesaj Alanı */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
            if (msg.type === 'call') {
                return <CallStatusMessage key={msg.id} message={msg} />;
            }
            return <MessageBubble key={msg.id} message={msg} currentUserId={user.uid} chatId={chatId} />;
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Mesaj Giriş Alanı */}
      <footer className="p-3 border-t bg-background">
         <div className="dm-input-glow rounded-full">
            <NewMessageInput
              chatId={chatId}
              sender={{ uid: user.uid, username: userData.username, photoURL: userData.photoURL, selectedAvatarFrame: userData.selectedAvatarFrame }}
              receiver={{ uid: partner.uid, username: partner.username, photoURL: partner.photoURL, selectedAvatarFrame: partner.selectedAvatarFrame }}
            />
        </div>
      </footer>
    </div>
  );
}
