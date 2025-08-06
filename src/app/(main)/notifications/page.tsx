
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, AtSign, Heart, MessageCircle, UserPlus, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import NotificationList from '@/components/notifications/NotificationList';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { deleteAllNotifications, markAllNotificationsAsRead } from '@/lib/actions/notificationActions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


/**
 * Bildirimler Sayfası
 * 
 * Kullanıcının aldığı tüm bildirimleri listeler.
 * Bildirimleri türlerine göre (Tümü, Bahsetmeler, Beğeniler vb.)
 * filtrelemek için sekmeli bir yapı kullanır.
 */
export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<false | 'read' | 'delete'>(false);


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

  const handleMarkAllRead = async () => {
    if (!user) return;
    setIsProcessing('read');
    try {
      await markAllNotificationsAsRead(user.uid);
      toast({ description: "Tüm bildirimler okundu olarak işaretlendi." });
    } catch (e: any) {
      toast({ variant: 'destructive', description: "İşlem sırasında bir hata oluştu." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    setIsProcessing('delete');
    try {
      await deleteAllNotifications(user.uid);
      toast({ description: "Tüm bildirimler silindi." });
    } catch (e: any) {
      toast({ variant: 'destructive', description: "Bildirimler silinirken bir hata oluştu." });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="container mx-auto max-w-3xl py-6">
      {/* Sayfa Başlığı ve Eylemler */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-7 w-7" />
          <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={isProcessing === 'read'}>
              {isProcessing === 'read' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCheck className="mr-2 h-4 w-4"/>}
              Tümünü Oku
           </Button>
           <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isProcessing === 'delete'}>
                    <Trash2 className="mr-2 h-4 w-4"/>
                    Temizle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tüm Bildirimleri Sil?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu işlem tüm bildirim geçmişinizi kalıcı olarak silecektir ve geri alınamaz. Devam etmek istediğinizden emin misiniz?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                     {isProcessing === 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Evet, Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
           </AlertDialog>
        </div>
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
