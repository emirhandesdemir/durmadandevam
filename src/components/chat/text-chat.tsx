// src/components/chat/text-chat.tsx
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

export interface Message {
  id: string;
  uid: string;
  username: string;
  photoURL?: string | null;
  text: string;
  type?: 'system' | 'game';
  createdAt: Timestamp;
  selectedChatBubble?: string; 
}

interface TextChatProps {
  messages: Message[];
  loading: boolean;
}

export default function TextChat({ messages, loading }: TextChatProps) {
  const { user: currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div className="space-y-6 p-4">
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {!loading && messages.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          Sohbeti başlatmak için bir mesaj gönderin!
        </div>
      )}
      {messages.map((msg) => {
        if (msg.type === 'system' || msg.type === 'game') {
          return (
            <div key={msg.id} className="text-center text-xs text-gray-400 italic my-4 animate-in fade-in">
              <p className={cn(
                  "inline-block p-2 rounded-full",
                  msg.type === 'game' ? 'bg-primary/10 text-primary font-semibold' : 'bg-gray-800'
              )}>
                {msg.text}
              </p>
            </div>
          );
        }

        const isCurrentUser = msg.uid === currentUser.uid;
        return (
          <div key={msg.id} className={cn("flex items-end gap-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-500", isCurrentUser && "flex-row-reverse")}>
            <div className="relative">
                 {msg.selectedChatBubble && (
                    <div className={`chat-bubble-wrapper ${msg.selectedChatBubble}`}>
                        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="bubble glowing" />)}
                    </div>
                )}
                <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.photoURL || undefined} />
                    <AvatarFallback>{msg.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
            </div>
            <div className={cn("flex flex-col gap-1 max-w-[70%]", isCurrentUser && "items-end")}>
                <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                   <p className="font-bold text-sm text-white">{isCurrentUser ? "Siz" : msg.username}</p>
                   <p className="text-xs text-gray-400">
                     {msg.createdAt ? format(msg.createdAt.toDate(), 'p', { locale: tr }) : ''}
                   </p>
                </div>
                <div className={cn("p-3 rounded-2xl", isCurrentUser ? "bg-primary text-primary-foreground rounded-br-lg" : "bg-gray-800 text-gray-200 rounded-bl-lg")}>
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
