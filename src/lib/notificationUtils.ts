'use client';

import { toast } from "@/hooks/use-toast";
import { saveFCMToken } from "./actions/userActions";

/**
 * Kullanıcıdan bildirim izni ister.
 * @returns {Promise<boolean>} İzin verilip verilmediğini döner.
 */
export async function requestNotificationPermission(userId: string): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
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
      console.log('Bildirim izni verildi.');
      // Simulating token fetching and saving for now.
      const mockToken = `mock_fcm_token_${userId}_${Date.now()}`;
      console.log('FCM Jetonu Alındı:', mockToken);
      await saveFCMToken(userId, mockToken);
      return true;
    } else {
      console.log('Bildirim izni verilmedi.');
      return false;
    }
  } catch (error) {
    console.error('Bildirim izni istenirken hata:', error);
    toast({
      variant: 'destructive',
      title: 'Hata',
      description: 'Bildirim izni alınırken bir sorun oluştu.',
    });
    return false;
  }
}
