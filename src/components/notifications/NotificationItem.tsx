// src/components/notifications/NotificationItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageCircle, UserPlus, DoorOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { joinRoom } from '@/lib/actions/roomActions';

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
  
  const handleJoinClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!user || !notification.roomId) return;
      setIsJoining(true);
      try {
          await joinRoom(notification.roomId, { uid: user.uid, username: user.displayName, photoURL: user.photoURL });
          router.push(`/rooms/${notification.roomId}`);
      } catch (error: any) {
          toast({ variant: 'destructive', description: error.message });
      } finally {
          setIsJoining(false);
      }
  };

  const renderContent = () => {
    switch (notification.type) {
      case 'like':
        return (
          <>
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <div className="flex-1">
              <Link href={`/profile/${notification.senderId}`} className="font-bold hover:underline">
                {notification.senderUsername}
              </Link>{' '}
              <Link href={`#`} className="hover:underline">
                 gönderini beğendi.
              </Link>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
            {notification.postImage && (
              <Link href={`#`}>
                <img src={notification.postImage} alt="Post preview" className="h-12 w-12 rounded-md object-cover"/>
              </Link>
            )}
          </>
        );
      case 'comment':
        return (
            <>
              <MessageCircle className="h-5 w-5 text-blue-500 fill-blue-500/20" />
              <div className="flex-1">
                 <Link href={`/profile/${notification.senderId}`} className="font-bold hover:underline">
                    {notification.senderUsername}
                </Link>{' '}
                <Link href={`#`} className="hover:underline">
                    gönderine yorum yaptı:
                </Link>
                <p className="text-sm text-foreground/80 italic line-clamp-2">
                  "{notification.commentText}"
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
               {notification.postImage && (
                <Link href={`#`}>
                    <img src={notification.postImage} alt="Post preview" className="h-12 w-12 rounded-md object-cover"/>
                </Link>
                )}
            </>
          );
      case 'follow':
        return (
            <>
                <UserPlus className="h-5 w-5 text-primary" />
                <div className="flex-1">
                    <Link href={`/profile/${notification.senderId}`} className="font-bold hover:underline">
                        {notification.senderUsername}
                    </Link>
                    {' '}seni takip etmeye başladı.
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
            </>
        );
      case 'follow_accept':
          return (
              <>
                  <UserPlus className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                      <Link href={`/profile/${notification.senderId}`} className="font-bold hover:underline">
                          {notification.senderUsername}
                      </Link>
                      {' '}takip isteğini kabul etti.
                      <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
              </>
          );
      case 'room_invite':
        return (
          <>
            <DoorOpen className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <Link href={`/profile/${notification.senderId}`} className="font-bold hover:underline">
                {notification.senderUsername}
              </Link>{' '}
              seni <span className="font-semibold">{notification.roomName}</span> odasına davet etti.
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
            {notification.roomId && (
                <Button size="sm" onClick={handleJoinClick} disabled={isJoining}>
                    {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Katıl"}
                </Button>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
       <Link href={`/profile/${notification.senderId}`}>
            <Avatar>
                <AvatarImage src={notification.senderAvatar || undefined} />
                <AvatarFallback>{notification.senderUsername?.charAt(0)}</AvatarFallback>
            </Avatar>
       </Link>
       {renderContent()}
    </div>
  );
}
