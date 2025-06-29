'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, limit, Query, writeBatch } from 'firebase/firestore';
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

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    
    const unreadQuery = query(
      collection(db, 'users', user.uid, 'notifications'), 
      where('read', '==', false)
    );
    const unreadSnapshot = await getDocs(unreadQuery);

    if (unreadSnapshot.empty) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { hasUnreadNotifications: false });
      return;
    }

    const batch = writeBatch(db);
    unreadSnapshot.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    
    const userRef = doc(db, 'users', user.uid);
    batch.update(userRef, { hasUnreadNotifications: false });
    
    await batch.commit();

  }, [user]);

  useEffect(() => {
    if (filter === 'all') {
      markAllAsRead();
    }
  }, [filter, markAllAsRead]);


  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    let q: Query;

    if (filter === 'all') {
      q = query(notifsRef, orderBy('createdAt', 'desc'), limit(50));
    } else {
      q = query(notifsRef, where('type', '==', filter), orderBy('createdAt', 'desc'), limit(50));
    }

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
