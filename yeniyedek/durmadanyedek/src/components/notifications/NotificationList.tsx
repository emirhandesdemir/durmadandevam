'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Notification } from '@/lib/types';
import NotificationItem from './NotificationItem';
import { Card, CardContent } from '@/components/ui/card';
import { BellOff, Loader2 } from 'lucide-react';

type NotificationFilter = 'all' | 'mention' | 'like' | 'comment' | 'follow';

interface NotificationListProps {
  filter: NotificationFilter;
}

export default function NotificationList({ filter }: NotificationListProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Bu sorgu artık sadece bildirimleri tarihe göre sıralar.
    // Filtreleme, daha iyi performans için istemci tarafında yapılır.
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let notifsData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Notification)
        );

        // İstemci tarafında filtreleme uygula.
        if (filter !== 'all') {
          notifsData = notifsData.filter(n => n.type === filter);
        }

        setNotifications(notifsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, filter]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (notifications.length === 0) {
    return (
      <Card className="text-center p-8 border-dashed rounded-xl">
        <CardContent className="p-0">
          <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Burada Gösterilecek Bir Şey Yok</h3>
          <p className="text-muted-foreground mt-2">
            Bu kategoride henüz bir bildiriminiz yok.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {notifications.map((notif) => (
        <NotificationItem key={notif.id} notification={notif} />
      ))}
    </div>
  );
}
