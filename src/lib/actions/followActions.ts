// src/lib/actions/followActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notificationActions';

export async function followUser(currentUserId: string, targetUserId: string, currentUserInfo: { username: string, photoURL: string | null, userAvatarFrame?: string }) {
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

    if (targetUserData.privateProfile) {
       if (targetUserData.acceptsFollowRequests === false) {
          throw new Error('Bu kullanıcı şu anda takip isteği kabul etmiyor.');
      }
      const newRequest = {
        uid: currentUserId,
        username: currentUserInfo.username,
        photoURL: currentUserInfo.photoURL,
        userAvatarFrame: currentUserInfo.userAvatarFrame || '',
        requestedAt: serverTimestamp(),
      };
      const requestExists = targetUserData.followRequests?.some((req: any) => req.uid === currentUserId);
      if (!requestExists) {
        transaction.update(targetUserRef, {
          followRequests: arrayUnion(newRequest),
        });
      }
    } else {
      const batch = writeBatch(db);
      batch.update(currentUserRef, {
        following: arrayUnion(targetUserId),
      });
      batch.update(targetUserRef, {
        followers: arrayUnion(currentUserId),
      });
      await batch.commit();

       await createNotification({
            recipientId: targetUserId,
            senderId: currentUserId,
            senderUsername: currentUserInfo.username || 'Biri',
            senderAvatar: currentUserInfo.photoURL,
            senderAvatarFrame: currentUserInfo.userAvatarFrame,
            type: 'follow',
        });
    }
  });

  revalidatePath(`/profile/${targetUserId}`);
}

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

export async function handleFollowRequest(currentUserId: string, requesterId: string, action: 'accept' | 'deny') {
  const currentUserRef = doc(db, 'users', currentUserId);
  const requesterRef = doc(db, 'users', requesterId);

  await runTransaction(db, async (transaction) => {
    const [currentUserDoc, requesterDoc] = await Promise.all([
        transaction.get(currentUserRef),
        transaction.get(requesterRef)
    ]);
    
    if (!currentUserDoc.exists() || !requesterDoc.exists()) {
      throw new Error('Kullanıcı bulunamadı.');
    }
    const currentUserData = currentUserDoc.data();

    const requestToRemove = currentUserData.followRequests?.find((req: any) => req.uid === requesterId);
    if (requestToRemove) {
      transaction.update(currentUserRef, {
        followRequests: arrayRemove(requestToRemove),
      });
    }

    if (action === 'accept') {
      transaction.update(currentUserRef, {
        followers: arrayUnion(requesterId),
      });
      transaction.update(requesterRef, {
        following: arrayUnion(currentUserId),
      });
      await createNotification({
            recipientId: requesterId,
            senderId: currentUserId,
            senderUsername: currentUserData.username || 'Biri',
            senderAvatar: currentUserData.photoURL,
            senderAvatarFrame: currentUserData.selectedAvatarFrame,
            type: 'follow_accept', // A new type for accepted request
        });
    }
  });

  revalidatePath('/requests');
  revalidatePath(`/profile/${requesterId}`);
  revalidatePath(`/profile/${currentUserId}`);
}
