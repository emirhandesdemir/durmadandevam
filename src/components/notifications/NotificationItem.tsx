// src/components/notifications/NotificationItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface NotificationItemProps {
  notification: Notification;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(notification.createdAt.toDate(), {
    addSuffix: true,
    locale: tr,
  });

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
