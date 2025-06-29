'use server';

import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { deepSerialize } from '../server-utils';

/**
 * Belirli bir kullanıcının profil bilgilerini getirir.
 * @param uid Bilgileri alınacak kullanıcının ID'si.
 * @returns {Promise<UserProfile | null>} Kullanıcı profilini veya bulunamazsa null döner.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        return deepSerialize(userData) as UserProfile;
    }
    return null;
}

/**
 * Kullanıcının FCM (Firebase Cloud Messaging) jetonunu veritabanına kaydeder.
 * @param userId Jetonu kaydedilecek kullanıcının ID'si.
 * @param token Kaydedilecek FCM jetonu.
 */
export async function saveFCMToken(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || !token) {
    return { success: false, error: 'Kullanıcı ID ve jeton gereklidir.' };
  }

  const userRef = doc(db, 'users', userId);
  try {
    // arrayUnion kullanarak jetonun zaten var olup olmadığını kontrol eder ve yoksa ekler.
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
    });
    return { success: true };
  } catch (error: any) {
    console.error('FCM jetonu kaydedilirken hata:', error);
    return { success: false, error: error.message };
  }
}
