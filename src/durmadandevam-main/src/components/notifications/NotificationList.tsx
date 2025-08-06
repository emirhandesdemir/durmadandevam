'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, limit, getDocs, doc, updateDoc, writeBatch, Query } from 'firebase/firestore';
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
    const userRef = doc(db, 'users', user.uid);

    // If there's nothing to mark as read, we still ensure the main flag is false.
    if (unreadSnapshot.empty) {
      await updateDoc(userRef, { hasUnreadNotifications: false });
      return;
    }

    const batch = writeBatch(db);
    unreadSnapshot.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    
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
    // This query no longer needs a composite index. It just sorts all notifications by date.
    // Filtering will be done on the client.
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let notifsData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Notification)
        );

        // Apply filtering on the client-side
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
  }, [user, filter]); // Rerun when filter changes

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
