
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

  const handleRequestPermission = useCallback(async (toastId: string) => {
    dismiss(toastId);
    window.OneSignalDeferred.push(async function(OneSignal) {
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
    // If OneSignal scripts are not loaded (e.g., in dev mode), do nothing.
    if (typeof window.OneSignalDeferred === 'undefined') {
        console.log("[OneSignal] SDK not loaded yet. Bailing out of permission logic.");
        return;
    }

    if (user) {
        console.log(`[OneSignal] User logged in: ${user.uid}. Initializing OneSignal user.`);
        window.OneSignalDeferred.push(function(OneSignal) {
            console.log("[OneSignal] SDK is ready. Calling OneSignal.login()");
            OneSignal.login(user.uid);
            OneSignal.User.addTag("username", user.displayName || "user");
        });

        // Prompt for permission if not granted
        const promptTimer = setTimeout(() => {
             window.OneSignalDeferred.push(async function(OneSignal) {
                const permission = OneSignal.Notifications.permission;
                console.log(`[OneSignal] Current notification permission state: ${permission}`);
                if (permission === 'default') {
                    console.log("[OneSignal] Permission is default. Prompting user.");
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
    } else {
        console.log("[OneSignal] No user logged in. Skipping OneSignal logic.");
    }
  }, [user, handleRequestPermission, toast]);
  
  return null;
}
