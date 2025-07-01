// src/lib/actions/matchmakingActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { createPrivateMatchRoom } from './roomActions';
import { getGameSettings } from './gameActions';

const matchmakingQueueRef = collection(db, 'matchmakingQueue');

/**
 * Enters the user into the matchmaking queue and attempts to find a match.
 */
export async function enterMatchmakingQueue(userId: string, userGender: 'male' | 'female') {
  const settings = await getGameSettings();
  const cost = settings.matchmakingCost;
  const userRef = doc(db, 'users', userId);

  try {
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
      const userData = userDoc.data();
      if ((userData.diamonds || 0) < cost) {
        throw new Error(`Eşleşme için ${cost} elmasa ihtiyacınız var.`);
      }

      const opponentGender = userGender === 'male' ? 'female' : 'male';
      const q = query(
        matchmakingQueueRef,
        where('gender', '==', opponentGender),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Match found
        const opponentDoc = querySnapshot.docs[0];
        const opponentId = opponentDoc.id;
        const opponentRef = doc(db, 'users', opponentId);
        const opponentData = (await transaction.get(opponentRef)).data();

        if (!opponentData) {
            // Opponent user data doesn't exist, remove from queue and try again for current user
            transaction.delete(opponentDoc.ref);
            // Re-add current user to queue
            transaction.set(doc(matchmakingQueueRef, userId), { gender: userGender, enteredAt: serverTimestamp() });
            transaction.update(userRef, { matchmakingStatus: 'searching' });
            return { status: 'searching' };
        }

        const newRoomId = await createPrivateMatchRoom(
            { uid: userId, username: userData.username, photoURL: userData.photoURL },
            { uid: opponentId, username: opponentData.username, photoURL: opponentData.photoURL }
        );

        // Update both users with the room ID
        transaction.update(userRef, { matchRoomId: newRoomId, matchmakingStatus: 'matched', diamonds: increment(-cost) });
        transaction.update(opponentRef, { matchRoomId: newRoomId, matchmakingStatus: 'matched', diamonds: increment(-cost) });

        // Remove both from queue
        transaction.delete(doc(matchmakingQueueRef, userId));
        transaction.delete(opponentDoc.ref);

        return { status: 'matched', roomId: newRoomId };
      } else {
        // No match found, add user to queue
        transaction.set(doc(matchmakingQueueRef, userId), { gender: userGender, enteredAt: serverTimestamp() });
        transaction.update(userRef, { matchmakingStatus: 'searching' });
        return { status: 'searching' };
      }
    });
  } catch (error: any) {
    console.error("Matchmaking error:", error);
    // Ensure user status is reset on error
    await updateDoc(userRef, { matchmakingStatus: 'idle' });
    return { status: 'error', message: error.message };
  }
}

/**
 * Removes a user from the matchmaking queue.
 */
export async function leaveMatchmakingQueue(userId: string) {
  const userQueueDoc = doc(matchmakingQueueRef, userId);
  const userProfileDoc = doc(db, 'users', userId);
  
  const batch = writeBatch(db);
  batch.delete(userQueueDoc);
  batch.update(userProfileDoc, { matchmakingStatus: 'idle' });
  
  await batch.commit();

  return { status: 'cancelled' };
}
