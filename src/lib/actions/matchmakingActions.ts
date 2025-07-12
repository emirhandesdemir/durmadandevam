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
  Timestamp,
} from 'firebase/firestore';
import type { MatchmakingChat, UserProfile } from '../types';
import { getChatId } from '../utils';
import { revalidatePath } from 'next/cache';


interface MatchmakingUser {
  uid: string;
  gender: 'male' | 'female';
  username: string;
  photoURL: string | null;
  age?: number;
  city?: string;
  interests?: string[];
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
    interests?: string[];
  }
): Promise<{ status: 'matched' | 'searching' | 'already_in_chat' | 'error', chatId?: string, error?: string }> {
  const userRef = doc(db, 'users', userId);

  try {
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && userDoc.data().activeMatchmakingChatId) {
      return {
        success: true,
        status: 'already_in_chat',
        chatId: userDoc.data().activeMatchmakingChatId,
      };
    }

    return await runTransaction(db, async (transaction) => {
      const PENDING_MATCHES = 'matchQueue';
      const pendingRef = collection(db, PENDING_MATCHES);
      const preferredGender = userInfo.gender === 'male' ? 'female' : 'male';
      
      const q = query(
        pendingRef,
        where('gender', '==', preferredGender),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await transaction.get(q);

      const potentialMatches = snapshot.docs.map(doc => doc.data() as MatchmakingUser);

      // --- Eşleştirme Önceliklendirme Mantığı ---
      let bestMatch: MatchmakingUser | null = null;
      
      // 1. Öncelik: Aynı şehir VE ortak ilgi alanı
      if(userInfo.city && userInfo.interests) {
        bestMatch = potentialMatches.find(p => 
            p.city === userInfo.city && 
            p.interests?.some(i => userInfo.interests!.includes(i))
        ) || null;
      }
      // 2. Öncelik: Sadece aynı şehir
      if (!bestMatch && userInfo.city) {
         bestMatch = potentialMatches.find(p => p.city === userInfo.city) || null;
      }
      // 3. Öncelik: Sadece ortak ilgi alanı
      if (!bestMatch && userInfo.interests) {
         bestMatch = potentialMatches.find(p => p.interests?.some(i => userInfo.interests!.includes(i))) || null;
      }
      // 4. Öncelik: Sırada bekleyen herhangi biri
      if (!bestMatch && potentialMatches.length > 0) {
        bestMatch = potentialMatches[0];
      }
      
      if (bestMatch) {
        const matchDocRef = doc(db, PENDING_MATCHES, bestMatch.uid);
        transaction.delete(matchDocRef);

        const chatId = `match_${getChatId(userId, bestMatch.uid)}_${Date.now()}`;
        const chatRef = doc(db, 'matchRooms', chatId);
        const chatData: Omit<MatchmakingChat, 'id'> = {
          participants: {
            [userId]: { username: userInfo.username, photoURL: userInfo.photoURL, age: userInfo.age },
            [bestMatch.uid]: { username: bestMatch.username, photoURL: bestMatch.photoURL, age: bestMatch.age },
          },
          participantUids: [userId, bestMatch.uid],
          status: 'active',
          createdAt: serverTimestamp() as Timestamp,
          reactions: {},
        };
        transaction.set(chatRef, chatData);

        transaction.update(doc(db, 'users', userId), { activeMatchmakingChatId: chatId });
        transaction.update(doc(db, 'users', bestMatch.uid), { activeMatchmakingChatId: chatId });

        return { status: 'matched', chatId: chatId };
      } else {
        const queueDocRef = doc(pendingRef, userId);
        const queueData: MatchmakingUser = {
          uid: userId,
          ...userInfo,
          timestamp: serverTimestamp(),
        };
        transaction.set(queueDocRef, queueData);
        return { status: 'searching' };
      }
    });
  } catch (error: any) {
    console.error("Eşleştirme hatası:", error);
    return { status: 'error', error: error.message };
  }
}

export async function cancelMatchmaking(userId: string) {
  const queueDocRef = doc(db, 'matchQueue', userId);
  await deleteDoc(queueDocRef).catch((e) =>
    console.log('User was likely already matched, cancellation failed:', e.message)
  );
  return { success: true };
}

export async function submitMatchReaction(
  chatId: string,
  userId: string
) {
  const chatRef = doc(db, 'matchRooms', chatId);
  
  return runTransaction(db, async (transaction) => {
    const chatDoc = await transaction.get(chatRef);
    if (!chatDoc.exists()) throw new Error('Sohbet bulunamadı.');
    
    const chatData = chatDoc.data() as MatchmakingChat;
    if (chatData.status !== 'active') return { success: false, error: 'Sohbet artık aktif değil.' };

    transaction.update(chatRef, { [`reactions.${userId}`]: 'like' });

    const partnerId = chatData.participantUids.find((uid) => uid !== userId);

    if (partnerId && chatData.reactions?.[partnerId] === 'like') {
      const permanentChatId = getChatId(userId, partnerId);
      
      const permanentChatMetaRef = doc(db, 'directMessagesMetadata', permanentChatId);
      const userInfo = chatData.participants[userId];
      const partnerInfo = chatData.participants[partnerId];

      transaction.set(permanentChatMetaRef, {
          participantUids: [userId, partnerId],
          participantInfo: {
            [userId]: { username: userInfo.username, photoURL: userInfo.photoURL },
            [partnerId]: { username: partnerInfo.username, photoURL: partnerInfo.photoURL }
          },
          lastMessage: null,
          unreadCounts: { [userId]: 0, [partnerId]: 0 }
      }, { merge: true });

      const user1Ref = doc(db, 'users', userId);
      const user2Ref = doc(db, 'users', partnerId);
      transaction.update(user1Ref, { following: arrayUnion(partnerId), followers: arrayUnion(partnerId), activeMatchmakingChatId: null });
      transaction.update(user2Ref, { following: arrayUnion(userId), followers: arrayUnion(userId), activeMatchmakingChatId: null });

      transaction.update(chatRef, { status: 'ended', permanentChatId: permanentChatId });
    }
  });
}

export async function endMatch(chatId: string, leaverId?: string) {
    const chatRef = doc(db, 'matchRooms', chatId);

    return runTransaction(db, async (transaction) => {
        const chatDoc = await transaction.get(chatRef);
        if (!chatDoc.exists()) {
            return;
        }

        const chatData = chatDoc.data();
        if (chatData.status !== 'active') return;
        
        transaction.update(chatRef, { status: leaverId ? 'abandoned' : 'ended' });
        
        for (const uid of chatData.participantUids) {
            transaction.update(doc(db, 'users', uid), { activeMatchmakingChatId: null });
        }
    });
}
