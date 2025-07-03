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
import ChatListSelectionHeader from './ChatListSelectionHeader';
import { useToast } from '@/hooks/use-toast';
import { togglePinChat, hideChat } from '@/lib/actions/dmActions';

interface ChatListProps {
  selectedChatId?: string;
}

/**
 * Kullanıcının tüm özel mesajlaşmalarını listeleyen bileşen.
 * Çoklu seçim modunu ve ilgili aksiyonları yönetir.
 */
export default function ChatList({ selectedChatId }: ChatListProps) {
  const { user } = useAuth();
  const [chats, setChats] = useState<DirectMessageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for multi-selection
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { toast } = useToast();

  const selectionActive = selectedItems.length > 0;

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

      chatsData = chatsData.filter(chat => !(chat.hiddenBy && chat.hiddenBy.includes(user.uid)));

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

  const handleLongPress = (chatId: string) => {
    setSelectedItems([chatId]);
  };

  const handleToggleSelection = (chatId: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(chatId)) {
        newSelection.delete(chatId);
      } else {
        newSelection.add(chatId);
      }
      return Array.from(newSelection);
    });
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const handlePinSelected = async () => {
    if (!user) return;
    try {
        await Promise.all(selectedItems.map(chatId => togglePinChat(chatId, user.uid, true)));
        toast({ description: `${selectedItems.length} sohbet sabitlendi.` });
    } catch (e: any) {
        toast({ variant: 'destructive', description: "Sohbetler sabitlenirken bir hata oluştu." });
    }
    handleClearSelection();
  };

  const handleDeleteSelected = async () => {
    if (!user) return;
     try {
        await Promise.all(selectedItems.map(chatId => hideChat(chatId, user.uid)));
        toast({ description: `${selectedItems.length} sohbet silindi.` });
    } catch (e: any) {
        toast({ variant: 'destructive', description: "Sohbetler silinirken bir hata oluştu." });
    }
    handleClearSelection();
  };


  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      {selectionActive ? (
        <ChatListSelectionHeader 
            count={selectedItems.length}
            onClear={handleClearSelection}
            onPin={handlePinSelected}
            onDelete={handleDeleteSelected}
        />
      ) : (
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Sohbetler</h2>
        </div>
      )}
      <ScrollArea className="flex-1">
        {chats.length > 0 ? (
          chats.map(chat => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              currentUserId={user!.uid}
              isSelected={selectedItems.includes(chat.id)}
              selectionActive={selectionActive}
              onToggleSelection={handleToggleSelection}
              onLongPress={handleLongPress}
            />
          ))
        ) : (
          <p className="p-4 text-center text-muted-foreground">Henüz sohbetiniz yok.</p>
        )}
      </ScrollArea>
    </div>
  );
}
