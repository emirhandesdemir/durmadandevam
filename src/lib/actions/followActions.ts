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
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notificationActions';

export async function followUser(currentUserId: string, targetUserId: string, currentUserInfo: { username: string, photoURL: string | null, profileEmoji: string | null, userAvatarFrame?: string }) {
  if (currentUserId === targetUserId) {
    throw new Error('Kendinizi takip edemezsiniz.');
  }

  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);
  
  const targetUserSnap = await getDoc(targetUserRef);
  if (!targetUserSnap.exists()) {
    throw new Error('Takip edilecek kullanıcı bulunamadı.');
  }
  const isPrivate = targetUserSnap.data().privateProfile;

  await runTransaction(db, async (transaction) => {
    const targetUserDoc = await transaction.get(targetUserRef);
    if (!targetUserDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
    
    const currentUserDoc = await transaction.get(currentUserRef);
    if (!currentUserDoc.exists()) throw new Error("İşlem yapan kullanıcı bulunamadı.");

    const targetUserData = targetUserDoc.data();
    
    // Update last action timestamp for rate limiting
    transaction.update(currentUserRef, { lastActionTimestamp: serverTimestamp() });

    if (targetUserData.privateProfile) {
       if (targetUserData.acceptsFollowRequests === false) {
          throw new Error('Bu kullanıcı şu anda takip isteği kabul etmiyor.');
      }
      const newRequest = {
        uid: currentUserId,
        username: currentUserInfo.username,
        photoURL: currentUserInfo.photoURL,
        profileEmoji: currentUserInfo.profileEmoji,
        userAvatarFrame: currentUserInfo.userAvatarFrame || '',
        requestedAt: serverTimestamp(),
      };
      // Ensure followRequests array exists before checking
      const requestExists = (targetUserData.followRequests || []).some((req: any) => req.uid === currentUserId);
      if (!requestExists) {
        transaction.update(targetUserRef, {
          followRequests: arrayUnion(newRequest),
        });
      }
    } else {
      transaction.update(currentUserRef, {
        following: arrayUnion(targetUserId),
      });
      transaction.update(targetUserRef, {
        followers: arrayUnion(currentUserId),
      });
    }
  });

  if (!isPrivate) {
    await createNotification({
        recipientId: targetUserId,
        senderId: currentUserId,
        senderUsername: currentUserInfo.username || 'Biri',
        senderAvatar: currentUserInfo.photoURL,
        profileEmoji: currentUserInfo.profileEmoji,
        senderAvatarFrame: currentUserInfo.userAvatarFrame,
        type: 'follow',
    });
  }

  revalidatePath(`/profile/${targetUserId}`);
  revalidatePath(`/profile/${currentUserId}`);
}

export async function unfollowUser(currentUserId: string, targetUserId: string) {
  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);

  await runTransaction(db, async (transaction) => {
    transaction.update(currentUserRef, {
        following: arrayRemove(targetUserId),
        lastActionTimestamp: serverTimestamp()
    });
    transaction.update(targetUserRef, {
        followers: arrayRemove(targetUserId),
    });
  });

  revalidatePath(`/profile/${targetUserId}`);
  revalidatePath(`/profile/${currentUserId}`);
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
        lastActionTimestamp: serverTimestamp()
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
            profileEmoji: currentUserData.profileEmoji,
            senderAvatarFrame: currentUserData.selectedAvatarFrame,
            type: 'follow_accept', // A new type for accepted request
        });
    }
  });

  revalidatePath(`/profile/${requesterId}`);
  revalidatePath(`/profile/${currentUserId}`);
}
