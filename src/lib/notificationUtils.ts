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
      // ÖNEMLİ: Bu alana, Firebase projenizin "Cloud Messaging" ayarlarından aldığınız
      // "Web Push sertifikaları" bölümündeki VAPID anahtar çiftini yapıştırmalısınız.
      // 
      // 1. Firebase Konsolu'na gidin (Proje ID: yenidendeneme-ea9ed)
      // 2. Proje Ayarları > Cloud Messaging sekmesi
      // 3. Web Push sertifikaları > "Anahtar çifti oluştur"
      // 4. Üretilen anahtarı kopyalayıp aşağıdaki tırnak işaretleri arasına yapıştırın.
      const vapidKey="BEv3RhiBuZQ8cDg2SAQf41tY_ijOEBJyCDLUY648St78CRgE57v8HWYUDBu6huI_kxzF_gKyelZi3Qbfgs8PMaE";
      
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
