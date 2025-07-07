// src/components/dm/ChatListItem.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DirectMessageMetadata } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, CheckCheck, Pin, CheckCircle2, Crown } from 'lucide-react';
import Link from 'next/link';
import useLongPress from '@/hooks/useLongPress';
import type { Timestamp } from 'firebase/firestore';

interface ChatListItemProps {
  chat: DirectMessageMetadata;
  currentUserId: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: (chatId: string) => void;
}

export default function ChatListItem({ chat, currentUserId, isSelected, isSelectionMode, onSelect }: ChatListItemProps) {
  const router = useRouter();
  
  const partnerId = chat.participantUids.find(uid => uid !== currentUserId);
  if (!partnerId) return null;
  const partnerInfo = chat.participantInfo[partnerId];
  if (!partnerInfo) return null;
  
  const lastMessage = chat.lastMessage;
  const unreadCount = chat.unreadCounts?.[currentUserId] || 0;
  const isUnread = unreadCount > 0;
  const isPinned = chat.pinnedBy?.includes(currentUserId);
  const isPartnerPremium = partnerInfo.premiumUntil && (partnerInfo.premiumUntil as Timestamp).toDate() > new Date();

  const timeAgo = lastMessage
    ? formatDistanceToNow(lastMessage.timestamp.toDate(), { addSuffix: true, locale: tr })
    : '';

  const handleClick = () => {
    if (isSelectionMode) {
      onSelect(chat.id);
    } else {
      router.push(`/dm/${chat.id}`);
    }
  };

  const handleLongPress = () => {
    onSelect(chat.id);
  };
  
  const longPressEvents = useLongPress(handleLongPress, handleClick, { delay: 400 });

  return (
    <>
      <div 
        {...longPressEvents}
        className={cn(
            "group relative flex items-center gap-4 p-3 transition-all duration-200 cursor-pointer rounded-xl border-2",
            isSelected ? "bg-primary/20 border-primary" : "border-transparent",
            isUnread && !isSelected ? "bg-primary/5" : "bg-card hover:bg-muted/50",
        )}
      >
        <div className="relative">
            <div>
                <Avatar className="relative z-[1] h-12 w-12">
                <AvatarImage src={partnerInfo.photoURL || undefined} />
                <AvatarFallback>{partnerInfo.username.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
            {isSelectionMode && (
                <div className={cn(
                    "absolute top-0 right-0 h-5 w-5 rounded-full flex items-center justify-center border-2 bg-background",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                )}>
                    {isSelected && <Check className="h-3 w-3" />}
                </div>
            )}
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isPinned && <Pin className="h-4 w-4 text-primary" />}
              <h3 className={cn("truncate", isUnread ? "font-bold text-foreground" : "font-semibold")}>
                  <Link href={`/profile/${partnerId}`} className="hover:underline flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {partnerInfo.username}
                    {isPartnerPremium && <Crown className="h-4 w-4 text-amber-500" />}
                  </Link>
              </h3>
            </div>
            <p className="text-xs text-muted-foreground shrink-0">{timeAgo}</p>
          </div>
          <div className="flex justify-between items-start mt-1">
            <p className={cn("text-sm truncate pr-2", isUnread ? "font-semibold" : "text-muted-foreground")}>
              {lastMessage && lastMessage.senderId === currentUserId && (
                <span className="inline-block mr-1">
                  {lastMessage.read ? <CheckCheck className="h-4 w-4 text-primary" /> : <Check className="h-4 w-4 text-muted-foreground" />}
                </span>
              )}
              {lastMessage?.text || 'Sohbet başlatıldı'}
            </p>
            {isUnread && (
              <Badge variant="default" className="h-6 min-w-[24px] flex items-center justify-center p-1 text-xs shrink-0">{unreadCount}</Badge>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
