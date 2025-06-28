// src/lib/actions/userActions.ts
'use server';

import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';

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
        // İstemciye göndermeden önce veriyi serileştirerek "düz" bir nesneye dönüştür.
        return JSON.parse(JSON.stringify(userData)) as UserProfile;
    }
    return null;
}
