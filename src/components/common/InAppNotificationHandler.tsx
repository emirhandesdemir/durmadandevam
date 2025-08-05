// src/components/common/InAppNotificationHandler.tsx
'use client';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useCallback, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AnimatePresence, motion } from 'framer-motion';

declare global {
  interface Window {
    OneSignal: any;
  }
}

interface NotificationData {
    title: string;
    body: string;
    link?: string;
    icon?: string;
}

interface InAppNotificationContextType {
    activeNotification: NotificationData | null;
}

const InAppNotificationContext = createContext<InAppNotificationContextType>({
    activeNotification: null,
});

export const useInAppNotification = () => useContext(InAppNotificationContext);


/**
 * Handles incoming push notifications while the app is in the foreground.
 * Displays a custom toast notification instead of the default browser notification.
 */
export default function InAppNotificationHandler() {
  const { user } = useAuth();
  const router = useRouter();
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const notificationListener = useCallback((event: any) => {
    event.preventDefault(); // Prevent default browser notification
    const { notification: rawNotification } = event;
    const { title, body, data } = rawNotification;

    // We only want to show DM notifications this way
    if (data?.type === 'dm_message') {
        const newNotif = {
            title,
            body,
            link: data?.link,
            icon: data?.icon,
        };
        setNotification(newNotif);
        
        setTimeout(() => {
            setNotification(null);
        }, 5000); // Hide after 5 seconds
    }
  }, []);

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

  const handleNotificationClick = () => {
    if (notification?.link) {
      router.push(notification.link);
    }
    setNotification(null);
  };
  
  return (
    <InAppNotificationContext.Provider value={{ activeNotification: notification }}>
       <div className="absolute top-0 left-0 right-0 z-50 flex justify-center">
            <AnimatePresence>
                {notification && (
                <motion.div
                    layout
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 16, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="w-[95%] max-w-md cursor-pointer"
                    onClick={handleNotificationClick}
                >
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-background shadow-2xl border">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={notification.icon} />
                            <AvatarFallback>{notification.title?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <h3 className="font-semibold truncate">{notification.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{notification.body}</p>
                        </div>
                    </div>
                </motion.div>
                )}
            </AnimatePresence>
       </div>
    </InAppNotificationContext.Provider>
  );
}
