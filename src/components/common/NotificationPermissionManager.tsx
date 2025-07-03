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
    if (user) {
        // Associate the user with OneSignal as soon as they log in
        window.OneSignalDeferred.push(function(OneSignal) {
            OneSignal.login(user.uid);
        });

        // Prompt for permission if not granted
        const promptTimer = setTimeout(() => {
             window.OneSignalDeferred.push(async function(OneSignal) {
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
