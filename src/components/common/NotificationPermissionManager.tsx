
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred?: any[];
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
  const isInitialized = useRef(false); // Ref to track initialization

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

  // Effect for initializing OneSignal and setting up listeners. Runs only once.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Ensure the deferred queue exists
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    window.OneSignalDeferred.push(function(OneSignal: any) {
        // Prevent re-initialization
        if (isInitialized.current) return;
        isInitialized.current = true;
        
        console.log('[OneSignal] Initializing SDK...');
        OneSignal.init({
            appId: oneSignalAppId,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: 'sw.js',
        }).then(() => {
            console.log("[OneSignal] SDK Initialized.");
            
            // Check for permission after init
            if (OneSignal.Notifications.permission === 'default') {
            promptForPermission();
            }
        });

        // Listener for notification permission changes
        OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
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
  }, [oneSignalAppId, promptForPermission, toast]);
  
  // This separate effect handles user login/logout based on auth state changes.
  useEffect(() => {
     if (typeof window === 'undefined') return;
     
     // Ensure the deferred queue exists
     window.OneSignalDeferred = window.OneSignalDeferred || [];

     window.OneSignalDeferred.push(function(OneSignal: any) {
        if (!isInitialized.current) {
            // Wait for initialization logic to run
            return;
        }

        if (user) {
            const externalId = OneSignal.User.getExternalId();
            if (externalId !== user.uid) {
                console.log(`[OneSignal] Auth state changed. Logging in user: ${user.uid}`);
                OneSignal.login(user.uid);
            }
        } else {
            const externalId = OneSignal.User.getExternalId();
            if (externalId) {
                console.log("[OneSignal] Auth state changed. User is null, logging out from OneSignal.");
                OneSignal.logout();
            }
        }
     });
  }, [user]);

  return null; // This component does not render anything
}
