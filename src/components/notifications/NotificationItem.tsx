'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageCircle, UserPlus, DoorOpen, Loader2, AtSign } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { joinRoom } from '@/lib/actions/roomActions';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  
  const timeAgo = formatDistanceToNow(notification.createdAt.toDate(), {
    addSuffix: true,
    locale: tr,
  });

  const handleWrapperClick = () => {
    if (notification.postId) {
      // TODO: Implement opening a post dialog/modal
      console.log("Navigating to post:", notification.postId);
    } else if (notification.type === 'follow' || notification.type === 'mention' || notification.type === 'follow_accept') {
       router.push(`/profile/${notification.senderId}`);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'like': return <Heart className="h-5 w-5 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="h-5 w-5 text-blue-500 fill-blue-500/20" />;
      case 'follow': return <UserPlus className="h-5 w-5 text-primary" />;
      case 'follow_accept': return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'mention': return <AtSign className="h-5 w-5 text-indigo-500" />;
      case 'room_invite': return <DoorOpen className="h-5 w-5 text-green-500" />;
      default: return null;
    }
  };

  const getText = () => {
     switch (notification.type) {
      case 'like': return <> <span className="font-bold">{notification.senderUsername}</span> gönderini beğendi.</>;
      case 'comment': return <> <span className="font-bold">{notification.senderUsername}</span> gönderine yorum yaptı: <span className="text-foreground/80 italic">"{notification.commentText}"</span></>;
      case 'follow': return <> <span className="font-bold">{notification.senderUsername}</span> seni takip etmeye başladı.</>;
      case 'follow_accept': return <> <span className="font-bold">{notification.senderUsername}</span> takip isteğini kabul etti.</>;
      case 'mention': return <> <span className="font-bold">{notification.senderUsername}</span> bir gönderide senden bahsetti.</>;
      case 'room_invite': return <> <span className="font-bold">{notification.senderUsername}</span> seni <span className="font-semibold">{notification.roomName}</span> odasına davet etti.</>;
      default: return 'Bilinmeyen bildirim';
    }
  }

  return (
    <div 
      className={cn(
        "flex items-start gap-4 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
      onClick={handleWrapperClick}
    >
      <div className="relative">
        <div className="flex-shrink-0">{getIcon()}</div>
        {!notification.read && <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-primary" />}
      </div>
       <Link href={`/profile/${notification.senderId}`} onClick={(e) => e.stopPropagation()}>
            <div className={cn("avatar-frame-wrapper", notification.senderAvatarFrame)}>
                <Avatar className="relative z-[1] h-10 w-10">
                    <AvatarImage src={notification.senderAvatar || undefined} />
                    <AvatarFallback>{notification.senderUsername?.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
       </Link>
       <div className="flex-1 text-sm">
          <p>{getText()}</p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
       </div>
        {notification.postImage && (
            <img src={notification.postImage} alt="Post preview" className="h-12 w-12 rounded-md object-cover"/>
        )}
    </div>
  );
}
