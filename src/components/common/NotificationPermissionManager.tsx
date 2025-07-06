
'use client';

import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred?: any[];
  }
}

// Manages OneSignal initialization and permission requests.
export default function NotificationPermissionManager() {
  const { toast, dismiss } = useToast();
  const oneSignalAppId = "51c67432-a305-43fc-a4c8-9c5d9d478d1c";

  // Handles the logic for requesting notification permissions from the user.
  const requestPermission = useCallback(() => {
    if (!window.OneSignal) return;

    window.OneSignal.Notifications.requestPermission().then((permission: boolean) => {
      if (permission) {
        toast({
          title: 'Teşekkürler!',
          description: 'Artık önemli etkinlikler için bildirim alacaksınız.',
        });
      } else {
        toast({
          title: 'Bildirimler Engellendi',
          description: 'Bildirimleri etkinleştirmek için tarayıcı ayarlarınızı kontrol edebilirsiniz.',
          variant: 'destructive'
        });
      }
    });
  }, [toast]);
  
  // Asks the user to enable notifications via a dismissible toast.
  const promptForPermission = useCallback(() => {
    const { id } = toast({
      title: 'Bildirimleri Etkinleştir',
      description: 'Uygulamadan en iyi şekilde yararlanmak için anlık bildirimlere izin verin.',
      duration: Infinity, 
      action: (
        <Button onClick={() => {
          requestPermission();
          dismiss(id);
        }}>
          <BellRing className="mr-2 h-4 w-4" />
          İzin Ver
        </Button>
      ),
    });
  }, [toast, dismiss, requestPermission]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function(OneSignal: any) {
      OneSignal.init({
        appId: oneSignalAppId,
        allowLocalhostAsSecureOrigin: true,
      }).then(() => {
        console.log("[OneSignal] SDK Initialized.");
        const permission = OneSignal.Notifications.permission;
        console.log("[OneSignal] Notification permission status:", permission);
        
        // If permission has not been asked, prompt the user.
        if (permission === 'default') {
          promptForPermission();
        }
      });
    });
  }, [oneSignalAppId, promptForPermission]);
  
  return null; // This component does not render anything
}
