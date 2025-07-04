'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';

declare global {
    interface Window {
        OneSignalDeferred: any[];
    }
}

export default function NotificationPermissionManager() {
  const { user } = useAuth();
  const { toast, dismiss } = useToast();
  const oneSignalAppId = "51c67432-a305-43fc-a4c8-9c5d9d478d1c";

  // Moved the initialization logic here
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function(OneSignal: any) {
      OneSignal.init({
        appId: oneSignalAppId,
      });
    });
  }, [oneSignalAppId]);


  const handleRequestPermission = useCallback(async (toastId: string) => {
    dismiss(toastId);
    window.OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.Notifications.requestPermission();
        const isEnabled = OneSignal.Notifications.enabled;
        
        if (isEnabled) {
            toast({
                title: 'Teşekkürler!',
                description: 'Artık önemli etkinlikler için bildirim alacaksınız.',
            });
        }
    });
  }, [dismiss, toast]);

  useEffect(() => {
    // If OneSignal scripts are not loaded, do nothing.
    if (typeof window.OneSignalDeferred === 'undefined') {
        console.log("[OneSignal] SDK not loaded yet. Bailing out of permission logic.");
        return;
    }

    if (user) {
        window.OneSignalDeferred.push(function(OneSignal: any) {
            OneSignal.login(user.uid);
            OneSignal.User.addTag("username", user.displayName || "user");
        });

        // Prompt for permission if not granted
        const promptTimer = setTimeout(() => {
             window.OneSignalDeferred.push(async function(OneSignal: any) {
                const permission = OneSignal.Notifications.permission;
                if (permission === 'default') {
                    const { id } = toast({
                        title: 'Bildirimleri Etkinleştir',
                        description: 'Uygulamadan en iyi şekilde yararlanmak için anlık bildirimlere izin verin.',
                        duration: Infinity, 
                        action: (
                            <Button onClick={() => handleRequestPermission(id)}>
                                <BellRing className="mr-2 h-4 w-4" />
                                İzin Ver
                            </Button>
                        ),
                    });
                }
             });
        }, 8000); // wait 8 seconds before prompting

        return () => clearTimeout(promptTimer);
    }
  }, [user, handleRequestPermission, toast]);
  
  return null;
}
