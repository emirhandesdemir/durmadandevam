// src/components/common/NotificationPermissionManager.tsx
'use client';

import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { saveFCMToken } from '@/lib/actions/userActions';

/**
 * Manages Firebase Cloud Messaging (FCM) interactions.
 */
export default function NotificationPermissionManager() {
  const { toast, dismiss } = useToast();
  const { user } = useAuth();
  const vapidKey = "BEv3RhiBuZQ8cDg2SAQf41tY_ijOEBJyCDLUY648St78CRgE57v8HWYUDBu6huI_kxzF_gKyelZi3Qbfgs8PMaE"; // VAPID key

  const requestPermissionAndGetToken = useCallback(async () => {
    if (!messaging || !user) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey });
        if (currentToken) {
          await saveFCMToken(user.uid, currentToken);
          toast({
            title: 'Bildirimler Etkinleştirildi!',
            description: 'Artık önemli güncellemeleri kaçırmayacaksınız.',
          });
        } else {
          throw new Error('Jeton alınamadı. Bildirim izninin verildiğinden emin olun.');
        }
      } else {
        toast({
          title: 'Bildirimler Engellendi',
          description: 'Bildirimleri etkinleştirmek için tarayıcı ayarlarınızı kontrol edebilirsiniz.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('An error occurred while retrieving token. ', error);
      toast({
        title: 'Bildirim Hatası',
        description: 'Bildirimler etkinleştirilemedi. Lütfen tarayıcı ayarlarınızı kontrol edip tekrar deneyin.',
        variant: 'destructive',
      });
    }
  }, [user, toast, vapidKey]);

  const promptForPermission = useCallback(() => {
    const { id } = toast({
      title: 'Bildirimleri Etkinleştir',
      description: 'Uygulamadan en iyi şekilde yararlanmak için anlık bildirimlere izin verin.',
      duration: 10000,
      action: (
        <Button onClick={() => {
          requestPermissionAndGetToken();
          dismiss(id);
        }}>
          <BellRing className="mr-2 h-4 w-4" />
          İzin Ver
        </Button>
      ),
    });
  }, [toast, dismiss, requestPermissionAndGetToken]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const timer = setTimeout(promptForPermission, 5000); 
        return () => clearTimeout(timer);
      }
    }
  }, [promptForPermission]);

  return null;
}
