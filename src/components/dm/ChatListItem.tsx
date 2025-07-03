// src/components/dm/ChatListItem.tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DirectMessageMetadata } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, CheckCheck, Pin } from 'lucide-react';

interface ChatListItemProps {
  chat: DirectMessageMetadata;
  currentUserId: string;
  isSelected: boolean;
  selectionActive: boolean;
  onLongPress: (chatId: string) => void;
  onToggleSelection: (chatId: string) => void;
}

export default function ChatListItem({ chat, currentUserId, isSelected, selectionActive, onLongPress, onToggleSelection }: ChatListItemProps) {
  const router = useRouter();
  const longPressTimer = useRef<NodeJS.Timeout>();
  const [isLongPress, setIsLongPress] = useState(false);

  const handleClick = () => {
    // Prevent click action after a long press
    if (isLongPress) {
        setIsLongPress(false);
        return;
    }
    // If in selection mode, toggle selection. Otherwise, navigate.
    if (selectionActive) {
      onToggleSelection(chat.id);
    } else {
      router.push(`/dm/${chat.id}`);
    }
  };

  const handlePointerDown = () => {
    setIsLongPress(false); // Reset on new touch
    longPressTimer.current = setTimeout(() => {
        onLongPress(chat.id);
        setIsLongPress(true); // Flag to prevent click after long press
    }, 500); // 500ms threshold for long press
  };

  const handlePointerUp = () => {
    clearTimeout(longPressTimer.current);
  };
  
  const handlePointerMove = () => {
      // Cancel long press if user is scrolling
      clearTimeout(longPressTimer.current);
  }

  const partnerId = chat.participantUids.find(uid => uid !== currentUserId);
  if (!partnerId) return null;
  const partnerInfo = chat.participantInfo[partnerId];
  if (!partnerInfo) return null;
  
  const lastMessage = chat.lastMessage;
  const unreadCount = chat.unreadCounts?.[currentUserId] || 0;
  const isUnread = unreadCount > 0;
  const partnerFrame = partnerInfo.selectedAvatarFrame || '';
  const isPinned = chat.pinnedBy?.includes(currentUserId);

  const timeAgo = lastMessage
    ? formatDistanceToNow(lastMessage.timestamp.toDate(), { addSuffix: true, locale: tr })
    : '';

  return (
    <div 
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onContextMenu={(e) => e.preventDefault()} // Prevent default context menu on desktop
        className="w-full cursor-pointer rounded-lg select-none"
    >
        <div className={cn(
            "relative flex items-center gap-4 p-3 border-b transition-colors",
            isSelected ? "bg-primary/20" : "hover:bg-muted/50",
            !selectionActive && isUnread ? "bg-primary/10" : "bg-card"
        )}>
            {/* Selection Overlay */}
            {isSelected && (
                <div className="absolute inset-0 bg-primary/20 z-10"></div>
            )}
            
            {/* Avatar */}
            <div className="relative z-20">
                <div className={cn("avatar-frame-wrapper", partnerFrame)}>
                    <Avatar className="relative z-[1] h-12 w-12">
                        <AvatarImage src={partnerInfo.photoURL || undefined} />
                        <AvatarFallback>{partnerInfo.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                {isUnread && !selectionActive && (
                    <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-background" />
                )}
                {isSelected && (
                     <div className="absolute -bottom-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground border-2 border-background">
                        <Check className="h-4 w-4"/>
                    </div>
                )}
            </div>
            
            {/* Chat Info */}
            <div className="flex-1 overflow-hidden z-20">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {isPinned && <Pin className="h-4 w-4 text-primary" />}
                        <h3 className={cn("truncate", isUnread && !isSelected ? "font-bold text-foreground" : "font-semibold")}>{partnerInfo.username}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{timeAgo}</p>
                </div>
                <div className="flex justify-between items-start mt-1">
                    <p className={cn(
                        "text-sm truncate pr-2", 
                        isUnread && !isSelected ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                    {lastMessage && lastMessage.senderId === currentUserId && (
                        <span className="inline-block mr-1">
                            {lastMessage.read ? <CheckCheck className="h-4 w-4 text-primary" /> : <Check className="h-4 w-4 text-muted-foreground" />}
                        </span>
                    )}
                    {lastMessage?.text || 'Sohbet başlatıldı'}
                    </p>
                    {isUnread && !selectionActive && (
                        <Badge variant="default" className="h-6 min-w-[24px] flex items-center justify-center p-1 text-xs shrink-0">{unreadCount}</Badge>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
