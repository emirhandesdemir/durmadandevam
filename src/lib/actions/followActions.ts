// src/lib/actions/followActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Bir kullanıcının profil gizliliğini açıp kapatır.
 * @param userId - Ayarı değiştirilecek kullanıcının UID'si.
 * @param isPrivate - Yeni gizlilik durumu (true: gizli, false: herkese açık).
 */
export async function toggleProfilePrivacy(userId: string, isPrivate: boolean) {
  if (!userId) {
    throw new Error('Kullanıcı IDsi gerekli.');
  }
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { privateProfile: isPrivate });
  revalidatePath(`/profile/${userId}`);
  revalidatePath('/profile'); // Kendi profil ayarları sayfası için
}

/**
 * Bir kullanıcıyı takip etme veya takip isteği gönderme işlemini gerçekleştirir.
 * @param currentUserId - Takip eden kullanıcının UID'si.
 * @param targetUserId - Takip edilecek kullanıcının UID'si.
 */
export async function followUser(currentUserId: string, targetUserId: string, currentUserInfo: { username: string, photoURL: string | null}) {
  if (currentUserId === targetUserId) {
    throw new Error('Kendinizi takip edemezsiniz.');
  }

  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);

  await runTransaction(db, async (transaction) => {
    const targetUserDoc = await transaction.get(targetUserRef);
    if (!targetUserDoc.exists()) {
      throw new Error('Takip edilecek kullanıcı bulunamadı.');
    }
    const targetUserData = targetUserDoc.data();

    // Kullanıcının gizli profili varsa takip isteği gönder
    if (targetUserData.privateProfile) {
      const newRequest = {
        uid: currentUserId,
        username: currentUserInfo.username,
        photoURL: currentUserInfo.photoURL,
        requestedAt: serverTimestamp(),
      };
      // Aynı isteğin tekrar gönderilmesini engelle
      const requestExists = targetUserData.followRequests?.some((req: any) => req.uid === currentUserId);
      if (!requestExists) {
        transaction.update(targetUserRef, {
          followRequests: arrayUnion(newRequest),
        });
      }
    } else {
      // Profil herkese açıksa doğrudan takip et
      const batch = writeBatch(db);
      batch.update(currentUserRef, {
        following: arrayUnion(targetUserId),
      });
      batch.update(targetUserRef, {
        followers: arrayUnion(currentUserId),
      });
      await batch.commit();
    }
  });

  revalidatePath(`/profile/${targetUserId}`);
}

/**
 * Bir kullanıcıyı takipten çıkarır.
 * @param currentUserId - Takipten çıkan kullanıcının UID'si.
 * @param targetUserId - Takipten çıkılan kullanıcının UID'si.
 */
export async function unfollowUser(currentUserId: string, targetUserId: string) {
  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);

  const batch = writeBatch(db);

  batch.update(currentUserRef, {
    following: arrayRemove(targetUserId),
  });
  batch.update(targetUserRef, {
    followers: arrayRemove(currentUserId),
  });

  await batch.commit();
  revalidatePath(`/profile/${targetUserId}`);
}

/**
 * Bir takip isteğini kabul veya reddeder.
 * @param currentUserId - İsteği yöneten (gizli profil sahibi) kullanıcının UID'si.
 * @param requesterId - İsteği gönderen kullanıcının UID'si.
 * @param action - Yapılacak işlem: 'accept' veya 'deny'.
 */
export async function handleFollowRequest(currentUserId: string, requesterId: string, action: 'accept' | 'deny') {
  const currentUserRef = doc(db, 'users', currentUserId);
  const requesterRef = doc(db, 'users', requesterId);

  await runTransaction(db, async (transaction) => {
    const currentUserDoc = await transaction.get(currentUserRef);
    if (!currentUserDoc.exists()) {
      throw new Error('Kullanıcı bulunamadı.');
    }
    const currentUserData = currentUserDoc.data();

    // İsteği 'followRequests' dizisinden bul ve kaldır
    const requestToRemove = currentUserData.followRequests?.find((req: any) => req.uid === requesterId);
    if (requestToRemove) {
      transaction.update(currentUserRef, {
        followRequests: arrayRemove(requestToRemove),
      });
    }

    // İstek kabul edildiyse, takipçi/takip edilen listelerini güncelle
    if (action === 'accept') {
      transaction.update(currentUserRef, {
        followers: arrayUnion(requesterId),
      });
      transaction.update(requesterRef, {
        following: arrayUnion(currentUserId),
      });
    }
  });

  revalidatePath('/requests');
  revalidatePath(`/profile/${requesterId}`);
}
