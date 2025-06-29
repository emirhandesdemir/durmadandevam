'use client';

import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission } from '@/lib/notificationUtils';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';

export default function NotificationPermissionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPermissionToast, setShowPermissionToast] = useState(false);

  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      // Delay the prompt slightly to not bombard the user immediately on login
      const timer = setTimeout(() => {
        setShowPermissionToast(true);
      }, 5000); 

      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleRequestPermission = async () => {
    if (!user) return;
    const granted = await requestNotificationPermission(user.uid);
    setShowPermissionToast(false);
    if (granted) {
      toast({
        title: 'Teşekkürler!',
        description: 'Artık önemli etkinlikler için bildirim alacaksınız.',
      });
    }
  };

  useEffect(() => {
     if (showPermissionToast) {
        const { id } = toast({
            title: 'Bildirimleri Etkinleştir',
            description: 'Uygulamadan en iyi şekilde yararlanmak için anlık bildirimlere izin verin.',
            duration: Infinity, // Keep it open until user interacts
            action: (
              <Button onClick={() => {
                handleRequestPermission();
                // We would normally dismiss here, but handleRequestPermission will dismiss it
              }}>
                <BellRing className="mr-2 h-4 w-4" />
                İzin Ver
              </Button>
            ),
          });
          return () => {
            // Cleanup toast if component unmounts
          }
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPermissionToast, user, toast]);
  

  return null; // This component does not render anything itself
}
