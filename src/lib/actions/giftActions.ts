// src/lib/actions/giftActions.ts
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { getGiftById } from '../gifts';

interface SendGiftArgs {
  roomId: string;
  senderId: string;
  senderName: string;
  receiverId?: string | null; // Null or undefined for room-wide gift
  giftId: string;
}

export async function sendGift({ roomId, senderId, senderName, receiverId, giftId }: SendGiftArgs) {
  if (!roomId || !senderId || !giftId) {
    throw new Error('Gerekli bilgiler eksik.');
  }

  const gift = getGiftById(giftId);
  if (!gift) {
    throw new Error('Geçersiz hediye IDsi.');
  }

  const senderRef = doc(db, 'users', senderId);
  const receiverRef = receiverId ? doc(db, 'users', receiverId) : null;
  const roomRef = doc(db, 'rooms', roomId);
  const messagesRef = collection(db, 'rooms', roomId, 'messages');

  return await runTransaction(db, async (transaction) => {
    const senderDoc = await transaction.get(senderRef);
    if (!senderDoc.exists() || (senderDoc.data().diamonds || 0) < gift.diamondCost) {
      throw new Error('Yetersiz elmas bakiyesi.');
    }

    // Deduct diamonds from sender
    transaction.update(senderRef, { diamonds: increment(-gift.diamondCost) });

    let receiverName: string | undefined;

    // If it's a gift to a specific user, increment their profile value
    if (receiverRef) {
      const receiverDoc = await transaction.get(receiverRef);
      if (!receiverDoc.exists()) {
        throw new Error('Hediye alıcısı bulunamadı.');
      }
      receiverName = receiverDoc.data().username;
      transaction.update(receiverRef, { profileValue: increment(gift.diamondCost) });
    }

    // Create a system message in the chat to announce the gift
    const giftMessageData = {
      type: 'gift' as const,
      uid: 'system', // Gifts are system messages
      text: `${senderName}, ${receiverName ? `${receiverName}'a` : 'odaya'} bir ${gift.name} gönderdi!`,
      createdAt: serverTimestamp(),
      giftData: {
        senderName: senderName,
        receiverName: receiverName,
        giftId: giftId,
      },
    };
    transaction.set(doc(messagesRef), giftMessageData);
    
    return { success: true };
  });
}
