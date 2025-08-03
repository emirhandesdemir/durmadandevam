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
import { Loader2, Pin, Trash2, Bot, Bell } from 'lucide-react';
import type { Message, Room } from '@/lib/types';
import PortalMessageCard from './PortalMessageCard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { pinMessage, deleteMessageByHost } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';
import GameInviteMessage from '../game/GameInviteMessage';
import GiftMessage from '../gifts/GiftMessage';
import AvatarWithFrame from '../common/AvatarWithFrame';

interface TextChatProps {
  messages: Message[];
  loading: boolean;
  room: Room;
}

const BOT_UID = "ai-bot-walk";

function AnnouncementMessageCard({ message }: { message: Message }) {
    return (
        <div className="relative my-4 p-4 text-center rounded-lg border-2 border-amber-500/50 bg-amber-900/40 text-amber-100 shadow-lg shadow-amber-500/10 backdrop-blur-sm">
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5">
                <Bell size={12} /> DUYURU
            </div>
            <p className="font-semibold">{message.text}</p>
            <p className="text-xs text-amber-200/70 mt-1">@{message.username} tarafından</p>
        </div>
    );
}

export default function TextChat({ messages, loading, room }: TextChatProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const isHost = currentUser?.uid === room.createdBy.uid;

  const handlePinMessage = async (messageId: string) => {
    if (!isHost) return;
    try {
        await pinMessage(room.id, messageId, currentUser!.uid);
        toast({ description: "Mesaj sabitlendi." });
    } catch (e: any) {
        toast({ variant: 'destructive', description: e.message });
    }
  }

  const handleDeleteByHost = async (messageId: string) => {
    if (!isHost) return;
    try {
      await deleteMessageByHost(room.id, messageId, currentUser!.uid);
      toast({ description: "Mesaj oda sahibi tarafından silindi." });
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6 p-4 text-white">
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
            <div key={msg.id} className="text-center text-xs text-white/70 italic my-4 animate-in fade-in">
              <p className={cn(
                  "inline-block px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm",
                  msg.type === 'game' ? 'text-primary font-semibold' : ''
              )}>
                {msg.text}
              </p>
            </div>
          );
        }
        
        if (msg.type === 'announcement') {
            return <AnnouncementMessageCard key={msg.id} message={msg} />;
        }
        
        if (msg.type === 'gameInvite') {
            return <GameInviteMessage key={msg.id} message={msg} roomId={room.id} />;
        }
        
        if (msg.type === 'gift') {
            return <GiftMessage key={msg.id} message={msg} />;
        }

        if (msg.type === 'portal') {
            return <PortalMessageCard key={msg.id} message={msg} />;
        }
        
        const isCurrentUser = msg.uid === currentUser.uid;
        const isBot = msg.uid === BOT_UID;
        const isParticipantHost = msg.uid === room.createdBy.uid;
        const isParticipantModerator = room.moderators?.includes(msg.uid);
        const isPrivileged = isParticipantHost || isParticipantModerator;
        
        return (
          <div key={msg.id} className={cn("flex items-end gap-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 group", isCurrentUser && "flex-row-reverse")}>
             <Link href={!isBot ? `/profile/${msg.uid}` : '#'}>
                <AvatarWithFrame
                    photoURL={msg.photoURL}
                    selectedAvatarFrame={msg.selectedAvatarFrame}
                    className="h-8 w-8"
                    fallback={msg.username?.charAt(0).toUpperCase()}
                />
            </Link>

            <div className={cn("flex flex-col gap-1 max-w-[70%]", isCurrentUser && "items-end")}>
                <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                   <p className={cn("font-bold text-sm", isPrivileged && !isCurrentUser ? "text-amber-400" : "text-white", isBot && "text-blue-400")}>{isCurrentUser ? "Siz" : msg.username}</p>
                   <p className="text-xs text-white/60">
                     {msg.createdAt ? format((msg.createdAt as Timestamp).toDate(), 'p', { locale: tr }) : ''}
                   </p>
                </div>

                <div className="relative group/message">
                     {msg.selectedBubble && !isBot && (
                        <div className={`bubble-wrapper ${msg.selectedBubble}`}>
                            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}
                        </div>
                    )}
                    <div className={cn(
                        "p-2 rounded-2xl relative text-sm", 
                        isCurrentUser 
                            ? "bg-primary text-primary-foreground rounded-br-none" 
                            : (isPrivileged
                                ? "bg-black/20 border-2 border-amber-400/50 rounded-bl-none text-white"
                                : isBot
                                    ? "bg-blue-500/20 border border-blue-500/30 rounded-bl-none text-white"
                                    : "bg-black/30 rounded-bl-none text-white")
                    )}>
                        {isBot && <Bot className="absolute -top-2 -left-2 h-5 w-5 text-blue-400 p-1 bg-background rounded-full" />}
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
                            <p className="break-words whitespace-pre-wrap mt-1 px-1">{msg.text}</p>
                        )}
                    </div>
                     {isHost && !isBot && (
                        <div className={cn("absolute top-0 opacity-0 group-hover/message:opacity-100 transition-opacity", isCurrentUser ? "-left-8" : "-right-8")}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white hover:bg-white/10 hover:text-white">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
                                    <DropdownMenuItem onClick={() => handlePinMessage(msg.id)}>
                                        <Pin className="mr-2 h-4 w-4" />
                                        <span>Sabitle</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteByHost(msg.id)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        <span>Mesajı Sil</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                     )}
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
