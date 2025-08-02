// src/lib/actions/liveActions.ts
'use server';
import { db } from '@/lib/firebase';
import { doc, collection, addDoc, serverTimestamp, updateDoc, getDoc, deleteDoc, runTransaction, increment, DocumentReference } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { getGiftById } from '../gifts';
import { logTransaction } from './transactionActions';

interface HostInfo {
  uid: string;
  username: string;
  photoURL: string | null;
}

export async function startLiveStream(host: HostInfo, title: string) {
  if (!host || !host.uid) throw new Error("Host information is required.");
  if (!title.trim()) throw new Error("A title is required to start a live stream.");

  const livesRef = collection(db, 'lives');
  const newLiveDoc = doc(livesRef);
  
  await setDoc(newLiveDoc, {
    hostId: host.uid,
    hostUsername: host.username,
    hostPhotoURL: host.photoURL,
    title,
    status: 'live',
    viewerCount: 0,
    createdAt: serverTimestamp(),
    totalGiftValue: 0,
  });

  revalidatePath('/live');
  return { success: true, liveId: newLiveDoc.id };
}

export async function endLiveStream(liveId: string, hostId: string) {
  if (!liveId || !hostId) throw new Error("Live ID and Host ID are required.");

  const liveRef = doc(db, 'lives', liveId);
  const liveDoc = await getDoc(liveRef);

  if (!liveDoc.exists() || liveDoc.data().hostId !== hostId) {
    throw new Error("Live stream not found or you do not have permission to end it.");
  }

  await updateDoc(liveRef, {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
  
  revalidatePath('/live');
  revalidatePath(`/live/${liveId}`);
  return { success: true };
}

export async function joinLiveStream(liveId: string, userId: string) {
    const liveRef = doc(db, 'lives', liveId);
    await updateDoc(liveRef, { viewerCount: increment(1) });
}

export async function leaveLiveStream(liveId: string, userId: string) {
    const liveRef = doc(db, 'lives', liveId);
    await runTransaction(db, async (transaction) => {
        const liveDoc = await transaction.get(liveRef);
        if (liveDoc.exists() && liveDoc.data().viewerCount > 0) {
            transaction.update(liveRef, { viewerCount: increment(-1) });
        }
    });
}

export async function sendLiveChatMessage(liveId: string, userId: string, username: string, message: string) {
    if (!liveId || !userId || !message.trim()) {
        throw new Error("Required information is missing.");
    }
    const messagesRef = collection(db, 'lives', liveId, 'liveChatMessages');
    await addDoc(messagesRef, {
        uid: userId,
        username,
        text: message,
        createdAt: serverTimestamp(),
        type: 'user',
    });
    return { success: true };
}

export async function sendLiveGift(liveId: string, senderId: string, senderName: string, giftId: string) {
    const gift = getGiftById(giftId);
    if (!gift) throw new Error("Invalid gift.");

    const senderRef = doc(db, 'users', senderId);
    const liveRef = doc(db, 'lives', liveId);

    return await runTransaction(db, async (transaction) => {
        const [senderDoc, liveDoc] = await Promise.all([
            transaction.get(senderRef),
            transaction.get(liveRef)
        ]);

        if (!senderDoc.exists() || !liveDoc.exists()) throw new Error("User or live session not found.");
        if (liveDoc.data().status !== 'live') throw new Error("This live stream has ended.");
        
        const senderData = senderDoc.data();
        const hostId = liveDoc.data().hostId;
        const hostRef = doc(db, 'users', hostId);

        if ((senderData.diamonds || 0) < gift.diamondCost) throw new Error("Yetersiz elmas bakiyesi.");

        // 1. Deduct diamonds from sender
        transaction.update(senderRef, { diamonds: increment(-gift.diamondCost) });

        // 2. Add value to host's profile
        transaction.update(hostRef, { profileValue: increment(gift.diamondCost) });

        // 3. Update live session's total gift value
        transaction.update(liveRef, { totalGiftValue: increment(gift.diamondCost) });

        // 4. Log transactions
        await logTransaction(transaction, senderId, { type: 'live_gift', amount: -gift.diamondCost, description: `${liveDoc.data().hostUsername} yayınına ${gift.name} hediyesi`, liveId, giftId });
        await logTransaction(transaction, hostId, { type: 'gift_received', amount: gift.diamondCost, description: `${senderName} kullanıcısından ${gift.name} hediyesi`, liveId, giftId, relatedUserId: senderId });

        // 5. Add a system message to the live chat
        const messagesRef = collection(db, 'lives', liveId, 'liveChatMessages');
        const giftMessage = {
            type: 'gift',
            uid: 'system',
            username: 'System',
            createdAt: serverTimestamp(),
            giftData: {
                senderName,
                giftId,
            }
        };
        transaction.set(doc(messagesRef), giftMessage);

        return { success: true };
    });
}
