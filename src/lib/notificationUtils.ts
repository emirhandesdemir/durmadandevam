'use client';

import { toast } from "@/hooks/use-toast";
import { saveFCMToken } from "./actions/userActions";
import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";

export async function requestNotificationPermission(userId: string): Promise<boolean> {
  if (!messaging || !('Notification' in window) || !('serviceWorker' in navigator)) {
    toast({
      variant: 'destructive',
      title: 'Desteklenmiyor',
      description: 'Tarayıcınız anlık bildirimleri desteklemiyor.',
    });
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // ÖNEMLİ: Bu anahtarı Firebase projenizden almanız gerekmektedir.
      // Proje Ayarları > Cloud Messaging > Web yapılandırması altında "Web Push sertifikaları" bölümünde bulabilirsiniz.
      // "Anahtar çifti" oluşturup tırnak işaretleri arasına yapıştırmalısınız.
      const vapidKey = "BLH_3eEeOQ0T95Ki_lO-W-p0w3uH0_s_H2r0j1q9J0r8M8wX9k7Z3J9l7X5c9l5r3H8J6k5L6w8C3j0Y2s";
      
      if (vapidKey.startsWith("REPLACE_WITH")) {
          console.error("VAPID anahtarı ayarlanmamış. Lütfen `src/lib/notificationUtils.ts` dosyasını güncelleyin.");
           toast({
              variant: 'destructive',
              title: 'Yapılandırma Eksik',
              description: 'Anlık bildirimler için VAPID anahtarı henüz ayarlanmamış.',
           });
          return false;
      }
      
      const currentToken = await getToken(messaging, { vapidKey });
      
      if (currentToken) {
        await saveFCMToken(userId, currentToken);
        return true;
      } else {
        toast({
          variant: 'destructive',
          description: 'Bildirim jetonu alınamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.',
        });
        return false;
      }
    } else {
      return false;
    }
  } catch (error: any) {
    console.error('Bildirim izni istenirken hata:', error);
    toast({
      variant: 'destructive',
      title: 'Hata',
      description: `Bildirim izni alınırken bir sorun oluştu. VAPID anahtarınızı kontrol edin. Hata: ${error.message}`,
    });
    return false;
  }
}
