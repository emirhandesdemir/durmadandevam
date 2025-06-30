'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';

export default function NetworkStatusNotifier() {
  const isOnline = useNetworkStatus();
  const { toast, dismiss } = useToast();
  const toastId = useRef<string | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
        firstLoad.current = false;
        // Do nothing on initial load, only on status change.
        return;
    }

    if (isOnline) {
      if (toastId.current) {
        dismiss(toastId.current);
        toastId.current = null;
        toast({
          title: 'Tekrar Çevrimiçisiniz',
          description: 'İnternet bağlantınız geri geldi.',
          className: 'bg-green-100 dark:bg-green-900/30 border-green-400',
        });
      }
    } else {
      const { id } = toast({
        title: 'Çevrimdışısınız',
        description: 'İnternet bağlantınız yok gibi görünüyor. Uygulamanın önbelleğe alınmış bir sürümünü kullanıyorsunuz.',
        variant: 'destructive',
        duration: Infinity,
      });
      toastId.current = id;
    }

    return () => {
        if(toastId.current) {
            dismiss(toastId.current);
        }
    }
  }, [isOnline, toast, dismiss]);

  return null;
}
