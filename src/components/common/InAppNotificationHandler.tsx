// src/components/common/InAppNotificationHandler.tsx
'use client';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    OneSignal: any;
  }
}

/**
 * Handles incoming push notifications while the app is in the foreground.
 * Displays a custom toast notification instead of the default browser notification.
 */
export default function InAppNotificationHandler() {
  const { toast, dismiss } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const notificationListener = useCallback((event: any) => {
    const { notification } = event;
    const { title, body, data, image } = notification;

    console.log('In-app notification received:', notification);

    const { id } = toast({
      duration: 8000,
      className: 'p-0 overflow-hidden',
      action: (
        <div
            className="flex items-start gap-3 p-4 cursor-pointer w-full"
            onClick={() => {
                if (data?.link) router.push(data.link);
                dismiss(id);
            }}
        >
            <Avatar className="h-10 w-10">
                <AvatarImage src={data?.icon} />
                <AvatarFallback>{title?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                 <h3 className="font-semibold">{title}</h3>
                 <p className="text-sm text-muted-foreground">{body}</p>
                 {image && <img src={image} className="w-full h-auto mt-2 rounded-md object-cover" alt="Notification image"/>}
            </div>
        </div>
      ),
    });
  }, [toast, dismiss, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.OneSignal) {
      window.OneSignal.Notifications.addEventListener('foregroundWillDisplay', notificationListener);
    }

    return () => {
      if (typeof window !== 'undefined' && window.OneSignal) {
        window.OneSignal.Notifications.removeEventListener('foregroundWillDisplay', notificationListener);
      }
    };
  }, [notificationListener]);

  return null;
}
