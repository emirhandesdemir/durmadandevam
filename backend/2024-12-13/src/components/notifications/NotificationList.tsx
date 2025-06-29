// src/components/notifications/NotificationList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Notification } from '@/lib/types';
import NotificationItem from './NotificationItem';
import { Card, CardContent } from '@/components/ui/card';
import { BellOff, Loader2 } from 'lucide-react';
import { markNotificationsAsRead } from '@/lib/actions/notificationActions';

export default function NotificationList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Mark notifications as read when the component mounts
  useEffect(() => {
    if (user) {
      markNotificationsAsRead(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const notifsRef = collection(db, 'notifications');
    const q = query(
      notifsRef,
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifsData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Notification)
        );
        setNotifications(notifsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (notifications.length === 0) {
    return (
      <Card className="text-center p-8 border-dashed rounded-xl">
        <CardContent className="p-0">
          <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Henüz Bildirim Yok</h3>
          <p className="text-muted-foreground mt-2">
            Etkileşimde bulunduğunda bildirimlerin burada görünecek.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <NotificationItem key={notif.id} notification={notif} />
      ))}
    </div>
  );
}
