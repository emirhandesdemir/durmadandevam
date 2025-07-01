// Bu dosya, kullanıcıdan anlık bildirim izni isteme ve
// alınan jetonu (token) veritabanına kaydetme mantığını içerir.
// İstemci tarafında çalışması gerektiği için 'use client' direktifi kullanılır.
'use client';

import { toast } from "@/hooks/use-toast";
import { saveFCMToken } from "./actions/userActions";
import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";

export async function requestNotificationPermission(userId: string): Promise<boolean> {
  // Tarayıcının bildirimleri destekleyip desteklemediğini kontrol et.
  if (!messaging || !('Notification' in window) || !('serviceWorker' in navigator)) {
    toast({
      variant: 'destructive',
      title: 'Desteklenmiyor',
      description: 'Tarayıcınız anlık bildirimleri desteklemiyor.',
    });
    return false;
  }
  
  try {
    // Kullanıcıdan bildirim izni iste.
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // ÖNEMLİ: Bu alana, Firebase projenizin "Cloud Messaging" ayarlarından aldığınız
      // "Web Push sertifikaları" bölümündeki VAPID anahtar çiftini yapıştırmalısınız.
      // Bu anahtar, tarayıcı ile Firebase arasında güvenli bir iletişim kanalı kurar.
      const vapidKey="BEv3RhiBuZQ8cDg2SAQf41tY_ijOEBJyCDLUY648St78CRgE57v8HWYUDBu6huI_kxzF_gKyelZi3Qbfgs8PMaE";
      
      // Firebase'den bu cihaza özel bildirim jetonunu al.
      const currentToken = await getToken(messaging, { vapidKey });
      
      if (currentToken) {
        // Alınan jetonu kullanıcının veritabanı kaydına ekle.
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
      return false; // Kullanıcı izin vermediyse.
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
