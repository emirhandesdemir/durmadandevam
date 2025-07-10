// src/app/(main)/matchmaking/chat/[chatId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MatchmakingChat, Message } from '@/lib/types';
import { Loader2, Swords, Timer, User, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TextChat from '@/components/chat/text-chat';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function MatchmakingChatHeader({ chat }: { chat: MatchmakingChat | null }) {
  const [timeLeft, setTimeLeft] = useState(240); // 4 minutes in seconds

  useEffect(() => {
    if (!chat || chat.status !== 'active') return;

    const endTime = (chat.createdAt as Timestamp).toMillis() + 4 * 60 * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((endTime - now) / 1000));
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [chat]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <header className="flex items-center justify-between p-3 border-b shrink-0">
      <div className="flex items-center gap-2 text-primary font-bold">
        <Swords className="h-5 w-5" />
        <span>Hızlı Sohbet</span>
      </div>
      <div className="flex items-center gap-2 font-semibold text-lg bg-muted px-3 py-1 rounded-full">
        <Timer className="h-5 w-5" />
        <span>{`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}</span>
      </div>
      <Button asChild variant="ghost" size="icon" className="rounded-full">
         <Link href="/matchmaking"><X/></Link>
      </Button>
    </header>
  );
}

export default function MatchmakingChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const chatId = params.chatId as string;

  const [chat, setChat] = useState<MatchmakingChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !chatId) return;

    const chatDocRef = doc(db, 'matchmakingChats', chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data() as MatchmakingChat;
        setChat(chatData);

        if(chatData.status === 'revealing' || chatData.status === 'ended' || chatData.status === 'abandoned') {
            router.replace(`/matchmaking/reveal/${chatId}`);
        }
      } else {
        router.replace('/matchmaking');
      }
      setLoading(false);
    });

    const messagesColRef = collection(db, `matchmakingChats/${chatId}/messages`);
    const q = query(messagesColRef, orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as Message));
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId, user, router]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (loading || !chat) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }

  // Simplified version of room for TextChat component
  const mockRoomForChat = {
      id: chat.id,
      participants: Object.values(chat.participants),
      createdBy: { uid: '' }, // not relevant for this chat
  } as any;

  return (
    <div className="flex flex-col h-full bg-background">
      <MatchmakingChatHeader chat={chat} />
      <main ref={chatScrollRef} className="flex-1 overflow-y-auto">
        <TextChat messages={messages} loading={false} room={mockRoomForChat} />
      </main>
      {/* Input is part of TextChat now, but a disabled footer could be here */}
    </div>
  );
}
