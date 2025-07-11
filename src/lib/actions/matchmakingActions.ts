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

// Eşleştirme sırasında kullanılacak kullanıcı bilgilerini tanımlayan arayüz
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

// Eşleşme arama mantığını içeren sunucu eylemi
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
) {
  const userRef = doc(db, 'users', userId);

  // Kullanıcının zaten aktif bir eşleşmede olup olmadığını kontrol et
  const userDoc = await getDoc(userRef);
  if (userDoc.exists() && userDoc.data().activeMatchmakingChatId) {
    return {
      success: true,
      status: 'already_in_chat',
      chatId: userDoc.data().activeMatchmakingChatId,
    };
  }

  // Atomik bir işlem başlatarak veri tutarlılığını sağla
  return await runTransaction(db, async (transaction) => {
    const PENDING_MATCHES = 'matchQueue';
    const pendingRef = collection(db, PENDING_MATCHES);
    const preferredGender = userInfo.gender === 'male' ? 'female' : 'male';
    let matchQuery;

    // Öncelik 1: Aynı şehir & en az bir ortak ilgi alanı olan kullanıcıyı bul
    if (userInfo.city && userInfo.interests && userInfo.interests.length > 0) {
      matchQuery = query(
        pendingRef,
        where('gender', '==', preferredGender),
        where('city', '==', userInfo.city),
        where('interests', 'array-contains-any', userInfo.interests),
        orderBy('timestamp', 'asc'),
        limit(1)
      );
    } else {
      // Öncelik 2: Sadece cinsiyete göre eşleştir
      matchQuery = query(
        pendingRef,
        where('gender', '==', preferredGender),
        orderBy('timestamp', 'asc'),
        limit(1)
      );
    }
    
    const snapshot = await transaction.get(matchQuery);

    if (!snapshot.empty) {
      // Eşleşme bulundu!
      const matchDoc = snapshot.docs[0];
      const matchedUser = matchDoc.data() as MatchmakingUser;

      // Bekleme sırasından eşleşen kullanıcıyı sil
      transaction.delete(matchDoc.ref);

      // Geçici sohbet odasını oluştur
      const participants = {
        [userId]: {
          username: userInfo.username,
          photoURL: userInfo.photoURL,
          age: userInfo.age
        },
        [matchedUser.uid]: {
          username: matchedUser.username,
          photoURL: matchedUser.photoURL,
          age: matchedUser.age,
        },
      };

      const chatId = `match_${getChatId(userId, matchedUser.uid)}_${Date.now()}`;
      const chatRef = doc(db, 'matchRooms', chatId);
      const chatData: Omit<MatchmakingChat, 'id'> = {
        participants,
        participantUids: [userId, matchedUser.uid],
        status: 'active',
        createdAt: serverTimestamp() as Timestamp,
        reactions: {},
      };
      transaction.set(chatRef, chatData);

      // Her iki kullanıcının da profiline aktif sohbet ID'sini yaz
      transaction.update(doc(db, 'users', userId), { activeMatchmakingChatId: chatId });
      transaction.update(doc(db, 'users', matchedUser.uid), { activeMatchmakingChatId: chatId });

      return { success: true, status: 'matched', chatId: chatId };
    } else {
      // Eşleşme bulunamadı, kullanıcıyı sıraya ekle
      const queueDoc = doc(pendingRef, userId);
      const queueData: MatchmakingUser = {
        uid: userId,
        ...userInfo,
        timestamp: serverTimestamp(),
      };
      transaction.set(queueDoc, queueData);
      return { success: true, status: 'searching' };
    }
  });
}

// Kullanıcının eşleşme aramasını iptal etmesi için eylem
export async function cancelMatchmaking(userId: string) {
  const queueDocRef = doc(db, 'matchQueue', userId);
  await deleteDoc(queueDocRef).catch((e) =>
    console.log('User was likely already matched, cancellation failed:', e.message)
  );
  return { success: true };
}

// Kullanıcının kalp ikonuna tıklamasını işleyen eylem
export async function submitMatchReaction(
  chatId: string,
  userId: string
) {
  const chatRef = doc(db, 'matchRooms', chatId);
  
  // Bu işlem de transaction içinde yapılmalı
  return runTransaction(db, async (transaction) => {
    const chatDoc = await transaction.get(chatRef);
    if (!chatDoc.exists()) throw new Error('Sohbet bulunamadı.');
    
    const chatData = chatDoc.data() as MatchmakingChat;
    if (chatData.status !== 'active') return { success: false, error: 'Sohbet artık aktif değil.' };

    // Kullanıcının reaksiyonunu kaydet
    transaction.update(chatRef, { [`reactions.${userId}`]: 'like' });

    const partnerId = chatData.participantUids.find((uid) => uid !== userId);

    // Eğer partner de beğendiyse, kalıcı eşleşmeyi oluştur
    if (partnerId && chatData.reactions?.[partnerId] === 'like') {
      const permanentChatId = getChatId(userId, partnerId);
      
      // Kalıcı sohbeti oluştur (metadata)
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

      // Kullanıcıları birbirine takip ettir
      const user1Ref = doc(db, 'users', userId);
      const user2Ref = doc(db, 'users', partnerId);
      transaction.update(user1Ref, { following: arrayUnion(partnerId), followers: arrayUnion(partnerId), activeMatchmakingChatId: null });
      transaction.update(user2Ref, { following: arrayUnion(userId), followers: arrayUnion(userId), activeMatchmakingChatId: null });

      // Geçici odayı güncelle
      transaction.update(chatRef, { status: 'ended', permanentChatId: permanentChatId });
    }
  });
}

// Süre dolduğunda veya bir kullanıcı ayrıldığında geçici odayı kapatan eylem
export async function endMatch(chatId: string, leaverId?: string) {
    const chatRef = doc(db, 'matchRooms', chatId);

    return runTransaction(db, async (transaction) => {
        const chatDoc = await transaction.get(chatRef);
        if (!chatDoc.exists() || chatDoc.data().status !== 'active') {
            return; // Already ended or cleaned up
        }

        const chatData = chatDoc.data() as MatchmakingChat;

        // Update status in the temporary room
        transaction.update(chatRef, { status: 'ended' });
        
        // Remove active chat ID from both users
        for (const uid of chatData.participantUids) {
            transaction.update(doc(db, 'users', uid), { activeMatchmakingChatId: null });
        }
    });
}

    