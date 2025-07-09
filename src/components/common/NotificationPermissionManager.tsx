// src/components/common/NotificationPermissionManager.tsx
'use client';

import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    OneSignal: any;
  }
}

/**
 * Manages all OneSignal SDK interactions: initialization, permission requests,
 * and user identification. This is the single source of truth for OneSignal.
 */
export default function NotificationPermissionManager() {
  const { toast, dismiss } = useToast();
  const { user } = useAuth(); // Get the current user from AuthContext
  const oneSignalAppId = "51c67432-a305-43fc-a4c8-9c5d9d478d1c";

  // Handles the logic for requesting notification permissions from the user.
  const requestPermission = useCallback(() => {
    window.OneSignal?.Notifications.requestPermission();
  }, []);

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

  // Effect for initializing OneSignal and handling user state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.OneSignal = window.OneSignal || [];
    window.OneSignal.push(function() {
        console.log('[OneSignal] Initializing SDK...');
        window.OneSignal.init({
          appId: oneSignalAppId,
          allowLocalhostAsSecureOrigin: true,
          // Explicitly define the service worker path. next-pwa generates sw.js in public root.
          serviceWorkerPath: 'sw.js',
        }).then(() => {
          console.log("[OneSignal] SDK Initialized.");
          
          // Check for permission after init
          if (window.OneSignal.Notifications.permission === 'default') {
            promptForPermission();
          }

          // Handle user login/logout for identification
          if (user) {
            console.log(`[OneSignal] Identifying user with external ID: ${user.uid}`);
            window.OneSignal.login(user.uid);
          }
        });

      // Listener for notification permission changes
      window.OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
        console.log("[OneSignal] New permission state:", permission);
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
    });
  }, [oneSignalAppId, promptForPermission, toast, user]);
  
  // This separate effect handles user login/logout after the initial setup.
  useEffect(() => {
     if (typeof window === 'undefined' || !window.OneSignal) return;
     window.OneSignal.push(function() {
        if (user) {
            if (!window.OneSignal.User.hasExternalId() || window.OneSignal.User.getExternalId() !== user.uid) {
                console.log(`[OneSignal] Auth state changed. Logging in user: ${user.uid}`);
                window.OneSignal.login(user.uid);
            }
        } else {
            if (window.OneSignal.User.hasExternalId()) {
                console.log("[OneSignal] Auth state changed. User is null, logging out from OneSignal.");
                window.OneSignal.logout();
            }
        }
     });
  }, [user]);

  return null; // This component does not render anything
}
