
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, AtSign, Heart, MessageCircle, UserPlus } from 'lucide-react';
import NotificationList from '@/components/notifications/NotificationList';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Bildirimler Sayfası
 * 
 * Kullanıcının aldığı tüm bildirimleri listeler.
 * Bildirimleri türlerine göre (Tümü, Bahsetmeler, Beğeniler vb.)
 * filtrelemek için sekmeli bir yapı kullanır.
 */
export default function NotificationsPage() {
  const { user } = useAuth();

  // Bu sayfa görüntülendiğinde, kullanıcının profilindeki
  // 'hasUnreadNotifications' bayrağını 'false' olarak güncelle.
  // Bu, üst menüdeki kırmızı bildirim noktasını kaldırır.
  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { hasUnreadNotifications: false }).catch(err => {
        console.error("Failed to mark notifications as read:", err);
      });
    }
  }, [user]);


  return (
    <div className="container mx-auto max-w-3xl py-6">
      {/* Sayfa Başlığı */}
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-7 w-7" />
        <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
      </div>
      
      {/* Filtreleme Sekmeleri */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Tümü</TabsTrigger>
          <TabsTrigger value="mention">
            <AtSign className="h-4 w-4 mr-1 sm:hidden" />
            <span className="hidden sm:inline">Bahsetmeler</span>
          </TabsTrigger>
          <TabsTrigger value="like">
             <Heart className="h-4 w-4 mr-1 sm:hidden" />
            <span className="hidden sm:inline">Beğeniler</span>
          </TabsTrigger>
          <TabsTrigger value="comment">
             <MessageCircle className="h-4 w-4 mr-1 sm:hidden" />
            <span className="hidden sm:inline">Yorumlar</span>
          </TabsTrigger>
          <TabsTrigger value="follow">
            <UserPlus className="h-4 w-4 mr-1 sm:hidden" />
            <span className="hidden sm:inline">Takipler</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Her sekme için içerik alanı */}
        <TabsContent value="all" className="mt-4">
          <NotificationList filter="all" />
        </TabsContent>
        <TabsContent value="mention" className="mt-4">
          <NotificationList filter="mention" />
        </TabsContent>
        <TabsContent value="like" className="mt-4">
          <NotificationList filter="like" />
        </TabsContent>
        <TabsContent value="comment" className="mt-4">
          <NotificationList filter="comment" />
        </TabsContent>
        <TabsContent value="follow" className="mt-4">
          <NotificationList filter="follow" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
