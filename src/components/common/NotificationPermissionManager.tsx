'use client';

import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission } from '@/lib/notificationUtils';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';

export default function NotificationPermissionManager() {
  const { user } = useAuth();
  const { toast, dismiss } = useToast();

  useEffect(() => {
    let toastId: string | null = null;
    if (user && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
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
        toastId = id;
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleRequestPermission = async (id: string) => {
    if (!user) return;
    dismiss(id);
    const granted = await requestNotificationPermission(user.uid);
    if (granted) {
      toast({
        title: 'Teşekkürler!',
        description: 'Artık önemli etkinlikler için bildirim alacaksınız.',
      });
    }
  };
  
  return null;
}
