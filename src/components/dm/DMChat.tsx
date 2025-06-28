// src/components/dm/DMChat.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, DirectMessage } from '@/lib/types';
import { markMessagesAsRead } from '@/lib/actions/dmActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import NewMessageInput from './NewMessageInput';
import MessageBubble from './MessageBubble';
import Link from 'next/link';

interface DMChatProps {
  chatId: string;
  partner: UserProfile;
}

/**
 * Belirli bir kullanıcı ile olan sohbetin arayüzünü oluşturur.
 */
export default function DMChat({ chatId, partner }: DMChatProps) {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sohbet açıldığında okunmamış mesajları işaretle
    if (user) {
      markMessagesAsRead(chatId, user.uid);
    }
  }, [chatId, user, messages]); // `messages` bağımlılığı, yeni bir mesaj geldiğinde tekrar kontrol etmeyi sağlar.

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
            <Avatar>
                <AvatarImage src={partner.photoURL || undefined} />
                <AvatarFallback>{partner.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="font-bold text-lg">{partner.username}</h2>
        </Link>
      </header>

      {/* Mesaj Alanı */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} currentUserId={user.uid} chatId={chatId} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Mesaj Giriş Alanı */}
      <footer className="p-3 border-t">
        <NewMessageInput
          chatId={chatId}
          sender={{ uid: user.uid, username: userData.username, photoURL: userData.photoURL, selectedAvatarFrame: userData.selectedAvatarFrame }}
          receiver={{ uid: partner.uid, username: partner.username, photoURL: partner.photoURL, selectedAvatarFrame: partner.selectedAvatarFrame }}
        />
      </footer>
    </div>
  );
}
