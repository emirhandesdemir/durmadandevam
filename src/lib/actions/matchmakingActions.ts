// src/lib/actions/matchmakingActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  collection,
  query,
  where,
  limit,
  runTransaction,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  getDoc,
  arrayUnion,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import type { MatchmakingChat, UserProfile, Timestamp } from '../types';
import { getChatId } from '../utils';

const PENDING_MATCHES = 'pendingMatches';

interface MatchmakingUser {
  uid: string;
  gender: 'male' | 'female';
  username: string;
  photoURL: string | null;
  age?: number;
  city?: string;
  timestamp: any;
}

export async function findMatch(
  userId: string,
  userInfo: {
    gender: 'male' | 'female';
    username: string;
    photoURL: string | null;
    age?: number;
    city?: string;
  }
) {
  const userRef = doc(db, 'users', userId);

  const userDoc = await getDoc(userRef);
  if (userDoc.exists() && userDoc.data().activeMatchmakingChatId) {
    return {
      success: true,
      status: 'already_in_chat',
      chatId: userDoc.data().activeMatchmakingChatId,
    };
  }

  return await runTransaction(db, async (transaction) => {
    const pendingRef = collection(db, PENDING_MATCHES);
    const preferredGender = userInfo.gender === 'male' ? 'female' : 'male';

    let matchDoc = null;

    // 1. Priority: Same city, opposite gender, similar age
    if (userInfo.city && userInfo.age) {
        const ageLowerBound = userInfo.age - 5;
        const ageUpperBound = userInfo.age + 5;
        const cityQuery = query(
            pendingRef,
            where('gender', '==', preferredGender),
            where('city', '==', userInfo.city),
            where('age', '>=', ageLowerBound),
            where('age', '<=', ageUpperBound),
            orderBy('timestamp', 'asc'),
            limit(1)
        );
        const citySnapshot = await transaction.get(cityQuery);
        if (!citySnapshot.empty) {
            matchDoc = citySnapshot.docs[0];
        }
    }

    // 2. Fallback: Opposite gender
    if (!matchDoc) {
        const genderQuery = query(pendingRef, where('gender', '==', preferredGender), orderBy('timestamp', 'asc'), limit(1));
        const genderSnapshot = await transaction.get(genderQuery);
        if (!genderSnapshot.empty) {
            matchDoc = genderSnapshot.docs[0];
        }
    }

    if (matchDoc) {
      // MATCH FOUND
      const matchedUser = matchDoc.data() as MatchmakingUser;
      transaction.delete(matchDoc.ref);

      const participants = {
        [userId]: {
          username: userInfo.username,
          photoURL: userInfo.photoURL,
        },
        [matchedUser.uid]: {
          username: matchedUser.username,
          photoURL: matchedUser.photoURL,
        },
      };

      const chatId = getChatId(userId, matchedUser.uid) + `_${Date.now()}`;
      const chatRef = doc(db, 'matchmakingChats', chatId);
      const chatData: Omit<MatchmakingChat, 'id'> = {
        participants,
        participantUids: [userId, matchedUser.uid],
        status: 'active',
        createdAt: serverTimestamp() as Timestamp,
      };
      transaction.set(chatRef, chatData);

      transaction.update(doc(db, 'users', userId), { activeMatchmakingChatId: chatId });
      transaction.update(doc(db, 'users', matchedUser.uid), { activeMatchmakingChatId: chatId });

      return { success: true, status: 'matched', chatId };
    } else {
      // NO MATCH FOUND, add to queue
      const queueDoc = doc(pendingRef, userId);
      const queueData: MatchmakingUser = {
        uid: userId,
        gender: userInfo.gender,
        username: userInfo.username,
        photoURL: userInfo.photoURL,
        age: userInfo.age,
        city: userInfo.city,
        timestamp: serverTimestamp(),
      };
      transaction.set(queueDoc, queueData);
      return { success: true, status: 'searching' };
    }
  });
}

export async function cancelMatchmaking(userId: string) {
  const queueDocRef = doc(db, PENDING_MATCHES, userId);
  await deleteDoc(queueDocRef).catch((e) =>
    console.log('User was likely already matched, cancellation failed:', e.message)
  );
  return { success: true };
}

export async function submitMatchReaction(
  chatId: string,
  userId: string,
  reaction: 'like' | 'pass'
) {
  const chatRef = doc(db, 'matchmakingChats', chatId);

  return runTransaction(db, async (transaction) => {
    const chatDoc = await transaction.get(chatRef);
    if (!chatDoc.exists()) throw new Error('Sohbet bulunamadı.');
    const chatData = chatDoc.data() as MatchmakingChat;
    
    transaction.update(chatRef, { [`reactions.${userId}`]: reaction });

    const partnerId = chatData.participantUids.find((uid) => uid !== userId);
    if (partnerId && chatData.reactions?.[partnerId]) {
      const partnerReaction = chatData.reactions[partnerId];
      if (reaction === 'like' && partnerReaction === 'like') {
        const user1Ref = doc(db, 'users', userId);
        const user2Ref = doc(db, 'users', partnerId);
        transaction.update(user1Ref, { following: arrayUnion(partnerId) });
        transaction.update(user2Ref, { following: arrayUnion(userId) });
        transaction.update(user1Ref, { followers: arrayUnion(partnerId) });
        transaction.update(user2Ref, { followers: arrayUnion(userId) });
      }
      transaction.update(chatRef, { status: 'ended' });
    }
  });
}

export async function handleUserLeftChat(chatId: string, leaverId: string) {
  const chatRef = doc(db, 'matchmakingChats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) return;

  const chatData = chatSnap.data() as MatchmakingChat;
  if (chatData.status !== 'active') return;

  const batch = writeBatch(db);
  batch.update(chatRef, { status: 'abandoned' });

  chatData.participantUids.forEach((uid) => {
    batch.update(doc(db, 'users', uid), { activeMatchmakingChatId: null });
  });

  await batch.commit();
}
