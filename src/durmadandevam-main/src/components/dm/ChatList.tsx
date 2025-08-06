// src/components/dm/ChatList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DirectMessageMetadata } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import ChatListItem from './ChatListItem';

interface ChatListProps {
  selectedChatId?: string;
}

/**
 * Kullanıcının tüm özel mesajlaşmalarını listeleyen bileşen.
 */
export default function ChatList({ selectedChatId }: ChatListProps) {
  const { user } = useAuth();
  const [chats, setChats] = useState<DirectMessageMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const metadataRef = collection(db, 'directMessagesMetadata');
    const q = query(
      metadataRef,
      where('participantUids', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let chatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as DirectMessageMetadata));

      chatsData.sort((a, b) => {
        const aIsPinned = a.pinnedBy?.includes(user.uid);
        const bIsPinned = b.pinnedBy?.includes(user.uid);

        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;

        const timeA = a.lastMessage?.timestamp?.toMillis() || 0;
        const timeB = b.lastMessage?.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      setChats(chatsData);
      setLoading(false);
    }, (error) => {
      console.error("Sohbet listesi alınırken hata:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Sohbetler</h2>
      </div>
      <ScrollArea className="flex-1">
        {chats.length > 0 ? (
          chats.map(chat => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              currentUserId={user!.uid}
            />
          ))
        ) : (
          <p className="p-4 text-center text-muted-foreground">Henüz sohbetiniz yok.</p>
        )}
      </ScrollArea>
    </div>
  );
}
