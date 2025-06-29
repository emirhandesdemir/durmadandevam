// src/lib/actions/userActions.ts
'use server';

import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, limit } from 'firebase/firestore';
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
 * Finds a single user by their exact username.
 * @param username The username to search for.
 * @returns A user profile object or null if not found.
 */
export async function findUserByUsername(username: string): Promise<UserProfile | null> {
    if (!username) return null;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const userDoc = snapshot.docs[0];
    const userData = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
    return deepSerialize(userData);
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
