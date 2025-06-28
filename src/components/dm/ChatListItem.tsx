// src/components/dm/ChatListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DirectMessageMetadata } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { Check, CheckCheck } from 'lucide-react';

interface ChatListItemProps {
  chat: DirectMessageMetadata;
  currentUserId: string;
  isSelected: boolean;
}

/**
 * Sohbet listesindeki tek bir elemanı temsil eder.
 */
export default function ChatListItem({ chat, currentUserId, isSelected }: ChatListItemProps) {
  // Karşıdaki kullanıcının ID'sini ve bilgilerini bul
  const partnerId = chat.participantUids.find(uid => uid !== currentUserId);
  if (!partnerId) return null;
  const partnerInfo = chat.participantInfo[partnerId];
  if (!partnerInfo) return null;
  
  const lastMessage = chat.lastMessage;
  const unreadCount = chat.unreadCounts?.[currentUserId] || 0;
  const partnerFrame = partnerInfo.selectedAvatarFrame || '';

  const timeAgo = lastMessage
    ? formatDistanceToNow(lastMessage.timestamp.toDate(), { addSuffix: true, locale: tr })
    : '';

  return (
    <Link href={`/dm/${chat.id}`} className="block">
      <div className={cn(
        "flex items-center gap-4 p-3 border-b hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted"
      )}>
        <div className={cn("avatar-frame-wrapper", partnerFrame)}>
          <Avatar className="relative z-[1] h-12 w-12">
            <AvatarImage src={partnerInfo.photoURL || undefined} />
            <AvatarFallback>{partnerInfo.username.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-center">
            <h3 className="font-bold truncate">{partnerInfo.username}</h3>
            <p className="text-xs text-muted-foreground shrink-0">{timeAgo}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground truncate">
              {lastMessage && lastMessage.senderId === currentUserId && (
                <span className="inline-block mr-1">
                    {lastMessage.read ? <CheckCheck className="h-4 w-4 text-primary" /> : <Check className="h-4 w-4" />}
                </span>
              )}
              {lastMessage?.text || 'Sohbet başlatıldı'}
            </p>
            {unreadCount > 0 && (
              <Badge className="h-6 w-6 flex items-center justify-center p-0">{unreadCount}</Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
