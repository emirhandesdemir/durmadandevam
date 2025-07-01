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
import { UserProfile } from '../types';

interface AppliedFilters {
    gender?: 'male' | 'female' | 'any';
    city?: string;
    ageRange?: [number, number];
}

const matchmakingQueueRef = collection(db, 'matchmakingQueue');

export async function purchaseMatchmakingRights(userId: string) {
    const cost = 5;
    const userRef = doc(db, 'users', userId);
    return await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
        const userData = userDoc.data();
        if ((userData.diamonds || 0) < cost) {
            throw new Error(`Satın almak için ${cost} elmasa ihtiyacınız var.`);
        }

        transaction.update(userRef, {
            diamonds: increment(-cost),
            matchmakingRights: increment(10),
        });
        return { success: true };
    }).catch(e => ({ success: false, error: e.message }));
}


export async function enterMatchmakingQueue(userId: string, userGender: 'male' | 'female', filters: AppliedFilters | null) {
  const userRef = doc(db, 'users', userId);

  // Stage 1: Charge the user and get their data in a single transaction
  const userData = await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
    const currentData = userDoc.data() as UserProfile;

    if ((currentData.matchmakingRights || 0) <= 0) {
        throw new Error("Eşleşme hakkınız kalmadı.");
    }
    if (filters) {
        const filterCost = 5;
        if ((currentData.diamonds || 0) < filterCost) {
            throw new Error(`Filtreleme için ${filterCost} elmasa ihtiyacınız var.`);
        }
        transaction.update(userRef, { diamonds: increment(-filterCost) });
    }
    
    transaction.update(userRef, { 
        matchmakingRights: increment(-1),
        matchmakingStatus: 'searching' 
    });
    
    return currentData;
  }).catch(error => {
      console.error("Transaction error (charge):", error);
      throw error; // Rethrow to be caught by the outer try-catch
  });
  
  // Stage 2: Perform matching logic (reads are outside transaction now)
  try {
      const opponentGender = filters?.gender !== 'any' && filters?.gender ? filters.gender : (userGender === 'male' ? 'female' : 'male');
      const q = query(
          matchmakingQueueRef,
          where('gender', '==', opponentGender),
          limit(30)
      );
      const queueSnapshot = await getDocs(q);

      if (!queueSnapshot.empty) {
          const opponentIds = queueSnapshot.docs.map(d => d.id);
          const opponentsQuery = query(collection(db, 'users'), where('uid', 'in', opponentIds));
          const opponentsSnapshot = await getDocs(opponentsQuery);

          let matchedOpponent: { id: string, data: UserProfile } | null = null;

          for (const opponentDoc of opponentsSnapshot.docs) {
              const opponentData = opponentDoc.data() as UserProfile;
              let isMatch = true;

              if (filters) {
                  if (filters.city && opponentData.city?.toLowerCase().trim() !== filters.city.toLowerCase().trim()) isMatch = false;
                  if (filters.ageRange) {
                      const [min, max] = filters.ageRange;
                      if (!opponentData.age || opponentData.age < min || opponentData.age > max) isMatch = false;
                  }
              }

              if (isMatch) {
                  matchedOpponent = { id: opponentDoc.id, data: opponentData };
                  break;
              }
          }

          if (matchedOpponent) {
              const newRoomId = await createPrivateMatchRoom(
                  { uid: userId, username: userData.username, photoURL: userData.photoURL },
                  { uid: matchedOpponent.id, username: matchedOpponent.data.username, photoURL: matchedOpponent.data.photoURL }
              );
              
              const batch = writeBatch(db);
              batch.update(userRef, { matchRoomId: newRoomId, matchmakingStatus: 'matched' });
              batch.update(doc(db, 'users', matchedOpponent.id), { matchRoomId: newRoomId, matchmakingStatus: 'matched' });
              batch.delete(doc(matchmakingQueueRef, matchedOpponent.id));
              await batch.commit();

              return { status: 'matched', roomId: newRoomId };
          }
      }

      // No match found, add current user to queue
      await setDoc(doc(matchmakingQueueRef, userId), { gender: userGender, enteredAt: serverTimestamp() });
      return { status: 'searching' };

  } catch (error: any) {
    console.error("Matchmaking error:", error);
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
