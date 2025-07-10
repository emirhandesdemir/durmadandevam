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
 * Manages all Firebase Cloud Messaging (FCM) interactions: permission requests,
 * token generation, and saving the token to the user's profile.
 */
export default function NotificationPermissionManager() {
  const { toast, dismiss } = useToast();
  const { user } = useAuth();
  const vapidKey = "BEv3RhiBuZQ8cDg2SAQf41tY_ijOEBJyCDLUY648St78CRgE57v8HWYUDBu6huI_kxzF_gKyelZi3Qbfgs8PMaE"; // Provided VAPID key

  const requestPermissionAndGetToken = useCallback(async () => {
    if (!messaging || !user) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        
        const currentToken = await getToken(messaging, {
          vapidKey: vapidKey,
        });

        if (currentToken) {
          console.log('FCM Token:', currentToken);
          await saveFCMToken(user.uid, currentToken);
          toast({
            title: 'Bildirimler Etkinleştirildi!',
            description: 'Artık önemli güncellemeleri kaçırmayacaksınız.',
          });
        } else {
          console.log('No registration token available. Request permission to generate one.');
          throw new Error('Jeton alınamadı. Bildirim izninin verildiğinden emin olun.');
        }
      } else {
        console.log('Unable to get permission to notify.');
        toast({
            title: 'Bildirimler Engellendi',
            description: 'Bildirimleri etkinleştirmek için tarayıcı ayarlarınızı kontrol edebilirsiniz.',
            variant: 'destructive'
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
      duration: Infinity,
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
    if (typeof window === 'undefined' || !user || !messaging) return;
    
    // Check if permission is already granted or denied.
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            // Wait a bit before prompting to not overwhelm the user on first load
            const timer = setTimeout(() => {
               promptForPermission();
            }, 5000); 
            return () => clearTimeout(timer);
        }
    }
  }, [user, promptForPermission]);

  return null; // This component does not render anything
}
