// src/components/chat/text-chat.tsx
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import type { Message } from '@/lib/types';
import PortalMessageCard from './PortalMessageCard';

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
            <div key={msg.id} className="text-center text-xs text-muted-foreground italic my-4 animate-in fade-in">
              <p className={cn(
                  "inline-block p-2 rounded-full",
                  msg.type === 'game' ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted'
              )}>
                {msg.text}
              </p>
            </div>
          );
        }

        if (msg.type === 'portal') {
            return <PortalMessageCard key={msg.id} message={msg} />;
        }

        const isCurrentUser = msg.uid === currentUser.uid;
        return (
          <div key={msg.id} className={cn("flex items-end gap-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-500", isCurrentUser && "flex-row-reverse")}>
            <Link href={`/profile/${msg.uid}`}>
                <div className={cn("avatar-frame-wrapper", msg.selectedAvatarFrame)}>
                    <Avatar className="relative z-[1] h-8 w-8">
                        <AvatarImage src={msg.photoURL || undefined} />
                        <AvatarFallback>{msg.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
            </Link>

            <div className={cn("flex flex-col gap-1 max-w-[70%]", isCurrentUser && "items-end")}>
                <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                   <p className="font-bold text-sm text-foreground">{isCurrentUser ? "Siz" : msg.username}</p>
                   <p className="text-xs text-muted-foreground">
                     {msg.createdAt ? format((msg.createdAt as Timestamp).toDate(), 'p', { locale: tr }) : ''}
                   </p>
                </div>

                <div className="relative">
                    {msg.selectedBubble && (
                        <div className={`bubble-wrapper ${msg.selectedBubble}`}>
                            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}
                        </div>
                    )}
                    <div className={cn("p-2 rounded-2xl relative", isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none")}>
                        {msg.imageUrl && (
                            <Image 
                                src={msg.imageUrl} 
                                alt={msg.text || "Gönderilen resim"}
                                width={300}
                                height={300}
                                className="rounded-md object-cover max-w-full h-auto"
                            />
                        )}
                        {msg.videoUrl && (
                            <video src={msg.videoUrl} controls className="w-full max-w-xs rounded-md" />
                        )}
                        {msg.text && (
                            <p className="text-sm break-words whitespace-pre-wrap mt-1 px-1">{msg.text}</p>
                        )}
                    </div>
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
