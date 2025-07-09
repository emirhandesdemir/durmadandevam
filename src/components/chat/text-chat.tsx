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
import { Loader2, Pin, Trash2 } from 'lucide-react';
import type { Message, Room } from '@/lib/types';
import PortalMessageCard from './PortalMessageCard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { pinMessage, deleteMessageByHost } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';
import GameInviteMessage from '../game/GameInviteMessage';

interface TextChatProps {
  messages: Message[];
  loading: boolean;
  room: Room;
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
        
        if (msg.type === 'gameInvite') {
            return <GameInviteMessage key={msg.id} message={msg} roomId={room.id} />;
        }

        if (msg.type === 'portal') {
            return <PortalMessageCard key={msg.id} message={msg} />;
        }
        
        const isCurrentUser = msg.uid === currentUser.uid;
        const isParticipantHost = msg.uid === room.createdBy.uid;
        const isParticipantModerator = room.moderators?.includes(msg.uid);
        const isPrivileged = isParticipantHost || isParticipantModerator;
        
        return (
          <div key={msg.id} className={cn("flex items-end gap-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 group", isCurrentUser && "flex-row-reverse")}>
             <Link href={`/profile/${msg.uid}`}>
                <div>
                    <Avatar className="relative z-[1] h-8 w-8">
                        <AvatarImage src={msg.photoURL || undefined} />
                        <AvatarFallback>{msg.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
            </Link>

            <div className={cn("flex flex-col gap-1 max-w-[70%]", isCurrentUser && "items-end")}>
                <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                   <p className={cn("font-bold text-sm", isPrivileged && !isCurrentUser ? "text-amber-500" : "text-foreground")}>{isCurrentUser ? "Siz" : msg.username}</p>
                   <p className="text-xs text-muted-foreground">
                     {msg.createdAt ? format((msg.createdAt as Timestamp).toDate(), 'p', { locale: tr }) : ''}
                   </p>
                </div>

                <div className="relative group/message">
                    <div className={cn(
                        "p-2 rounded-2xl relative", 
                        isCurrentUser 
                            ? "bg-primary text-primary-foreground rounded-br-none" 
                            : (isPrivileged
                                ? "bg-card border-2 border-amber-400/50 rounded-bl-none text-foreground" 
                                : "bg-card rounded-bl-none text-foreground")
                    )}>
                        {msg.imageUrl && (
                            <Image 
                                src={msg.imageUrl} 
                                alt={msg.text || "Gönderilen resim"}
                                width={300}
                                height={300}
                                className="rounded-md object-cover max-w-full h-auto"
                            />
                        )}
                        {msg.text && (
                            <p className="text-sm break-words whitespace-pre-wrap mt-1 px-1">{msg.text}</p>
                        )}
                    </div>
                     {isHost && (
                        <div className={cn("absolute top-0 opacity-0 group-hover/message:opacity-100 transition-opacity", isCurrentUser ? "-left-8" : "-right-8")}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
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
