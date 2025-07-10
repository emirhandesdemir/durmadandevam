// This file is obsolete and has been removed to clean up the project.
'use server';
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, arrayUnion, serverTimestamp, setDoc, collection, query, where, limit, deleteDoc, updateDoc, arrayRemove, writeBatch } from 'firebase/firestore';
import type { DirectMessageMetadata, MatchmakingChat, UserProfile, Timestamp } from '../types';
import { getChatId } from '../utils';
import { createNotification } from './notificationActions';

const PENDING_MATCHES = 'pendingMatches';

interface MatchmakingUser {
    uid: string;
    gender: 'male' | 'female';
    username: string;
    photoURL: string | null;
    timestamp: any;
}

export async function findMatch(userId: string, userInfo: { gender: 'male' | 'female', username: string, photoURL: string | null }) {
    const userRef = doc(db, 'users', userId);
    
    // First, check if user already has an active chat
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && userDoc.data().activeMatchmakingChatId) {
        // User is already in a chat, maybe they refreshed the page.
        // The client-side listener should handle redirection.
        return { success: true, status: 'already_in_chat', chatId: userDoc.data().activeMatchmakingChatId };
    }

    return await runTransaction(db, async (transaction) => {
        const preferredGender = userInfo.gender === 'male' ? 'female' : 'male';
        const pendingRef = collection(db, PENDING_MATCHES);
        
        // Look for a preferred match first
        const preferredQuery = query(pendingRef, where('gender', '==', preferredGender), limit(1));
        const preferredSnapshot = await transaction.get(preferredQuery);

        let matchDoc = !preferredSnapshot.empty ? preferredSnapshot.docs[0] : null;

        // If no preferred match, look for any match
        if (!matchDoc) {
            const anyQuery = query(pendingRef, where('gender', '==', userInfo.gender), limit(1));
            const anySnapshot = await transaction.get(anyQuery);
            matchDoc = !anySnapshot.empty ? anySnapshot.docs[0] : null;
        }

        if (matchDoc) {
            // MATCH FOUND
            const matchedUser = matchDoc.data() as MatchmakingUser;
            transaction.delete(matchDoc.ref); // Remove from queue

            const participants = {
                [userId]: { username: userInfo.username, photoURL: userInfo.photoURL },
                [matchedUser.uid]: { username: matchedUser.username, photoURL: matchedUser.photoURL },
            };
            
            // Create a temporary chat room
            const chatId = getChatId(userId, matchedUser.uid) + `_${Date.now()}`;
            const chatRef = doc(db, 'matchmakingChats', chatId);
            const chatData: Omit<MatchmakingChat, 'id'> = {
                participants,
                participantUids: [userId, matchedUser.uid],
                status: 'active',
                createdAt: serverTimestamp() as Timestamp,
            };
            transaction.set(chatRef, chatData);

            // Update both users with the new chat ID
            transaction.update(doc(db, 'users', userId), { activeMatchmakingChatId: chatId });
            transaction.update(doc(db, 'users', matchedUser.uid), { activeMatchmakingChatId: chatId });
            
            return { success: true, status: 'matched', chatId: chatId };
        } else {
            // NO MATCH FOUND, add to queue
            const queueDoc = doc(pendingRef, userId);
            const queueData: MatchmakingUser = {
                uid: userId,
                gender: userInfo.gender,
                username: userInfo.username,
                photoURL: userInfo.photoURL,
                timestamp: serverTimestamp()
            };
            transaction.set(queueDoc, queueData);
            return { success: true, status: 'searching' };
        }
    });
}

export async function cancelMatchmaking(userId: string) {
    const queueDocRef = doc(db, PENDING_MATCHES, userId);
    await deleteDoc(queueDocRef).catch(e => console.log("User was likely already matched, cancellation failed:", e.message));
    return { success: true };
}


export async function submitMatchReaction(chatId: string, userId: string, reaction: 'like' | 'pass') {
  const chatRef = doc(db, 'matchmakingChats', chatId);

  return runTransaction(db, async (transaction) => {
    const chatDoc = await transaction.get(chatRef);
    if (!chatDoc.exists()) throw new Error("Sohbet bulunamadı.");

    const chatData = chatDoc.data() as MatchmakingChat;

    // Set the reaction for the current user.
    transaction.update(chatRef, { [`reactions.${userId}`]: reaction });
    
    // Check if the other user has also reacted.
    const partnerId = chatData.participantUids.find(uid => uid !== userId);
    if (partnerId && chatData.reactions?.[partnerId]) {
      // Both users have reacted.
      const partnerReaction = chatData.reactions[partnerId];
      if (reaction === 'like' && partnerReaction === 'like') {
        // IT'S A MATCH!
        const user1Id = userId;
        const user2Id = partnerId;
        const user1Info = chatData.participants[user1Id];
        const user2Info = chatData.participants[user2Id];

        const permChatId = getChatId(user1Id, user2Id);
        const metadataRef = doc(db, 'directMessagesMetadata', permChatId);
        const user1Ref = doc(db, 'users', user1Id);
        const user2Ref = doc(db, 'users', user2Id);
        
        transaction.update(user1Ref, { following: arrayUnion(user2Id) });
        transaction.update(user2Ref, { following: arrayUnion(user1Id) });
        transaction.update(user1Ref, { followers: arrayUnion(user2Id) });
        transaction.update(user2Ref, { followers: arrayUnion(user1Id) });

        // Create DM room if it doesn't exist.
        transaction.set(metadataRef, {
            participantUids: [user1Id, user2Id],
            participantInfo: {
                [user1Id]: { username: user1Info.username, photoURL: user1Info.photoURL || null },
                [user2Id]: { username: user2Info.username, photoURL: user2Info.photoURL || null },
            },
            lastMessage: null,
            unreadCounts: { [user1Id]: 0, [user2Id]: 0 },
        }, { merge: true }); // Merge in case a room already exists.
        
        transaction.update(chatRef, { status: 'ended' });

      } else {
        // NOT A MATCH or one passed.
        transaction.update(chatRef, { status: 'ended' });
      }
    }
  });
}


export async function handleUserLeftChat(chatId: string, leaverId: string) {
    const chatRef = doc(db, 'matchmakingChats', chatId);
    const leaverUserRef = doc(db, 'users', leaverId);

    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) return;

    const chatData = chatSnap.data() as MatchmakingChat;
    if (chatData.status !== 'active') return;

    const batch = writeBatch(db);
    batch.update(chatRef, { status: 'abandoned' });

    // Clear active chat for both users
    chatData.participantUids.forEach(uid => {
        batch.update(doc(db, 'users', uid), { activeMatchmakingChatId: null });
    });
    
    await batch.commit();
}
