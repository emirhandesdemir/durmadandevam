// src/lib/actions/giftActions.ts
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, increment, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { getGiftById, getRoomLevelInfo } from '../gifts';
import { logTransaction } from './transactionActions';
import { openPortalForRoom } from './roomActions';
import { addSystemMessage } from './roomActions';


interface SendGiftArgs {
  roomId: string;
  senderId: string;
  senderName: string;
  receiverId?: string | null; // Null or undefined for room-wide gift
  giftId: string;
}

const giftLevelThresholds = [
    { level: 1, diamonds: 100 },
    { level: 2, diamonds: 500 },
    { level: 3, diamonds: 1000 },
    { level: 4, diamonds: 2500 },
    { level: 5, diamonds: 5000 },
    { level: 6, diamonds: 10000 },
    { level: 7, diamonds: 25000 },
    { level: 8, diamonds: 50000 },
    { level: 9, diamonds: 75000 },
    { level: 10, diamonds: 100000 },
];

function getGiftLevel(totalDiamondsSent: number): number {
    let level = 0;
    for (const threshold of giftLevelThresholds) {
        if (totalDiamondsSent >= threshold.diamonds) {
            level = threshold.level;
        } else {
            break;
        }
    }
    return level;
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
    
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists()) {
        throw new Error('Oda bulunamadı.');
    }
    const roomData = roomDoc.data();
    
    const senderData = senderDoc.data();
    const newTotalDiamondsSent = (senderData.totalDiamondsSent || 0) + gift.diamondCost;
    const newGiftLevel = getGiftLevel(newTotalDiamondsSent);
    
    // Deduct diamonds and update gift stats for sender
    const senderUpdates: { [key: string]: any } = {
        diamonds: increment(-gift.diamondCost),
        totalDiamondsSent: newTotalDiamondsSent
    };
    if (newGiftLevel > (senderData.giftLevel || 0)) {
        senderUpdates.giftLevel = newGiftLevel;
    }
    transaction.update(senderRef, senderUpdates);


    let receiverName: string | null = null;
    let leveledUp = false;

    // If it's a gift to a specific user, increment their profile value
    if (receiverRef) {
      const receiverDoc = await transaction.get(receiverRef);
      if (!receiverDoc.exists()) {
        throw new Error('Hediye alıcısı bulunamadı.');
      }
      receiverName = receiverDoc.data().username;
      transaction.update(receiverRef, { profileValue: increment(gift.diamondCost) });

      // Log transaction for receiver
       await logTransaction(transaction, receiverId!, {
            type: 'gift_received',
            amount: gift.diamondCost,
            description: `${senderName} kullanıcısından ${gift.name} hediyesi`,
            relatedUserId: senderId,
            giftId: giftId,
       });
    } else {
        // Gift to the room, update room XP
        const currentXp = roomData.xp || 0;
        const newXp = currentXp + gift.diamondCost;
        const oldLevelInfo = getRoomLevelInfo(currentXp);
        const newLevelInfo = getRoomLevelInfo(newXp);
        
        const roomUpdates: { [key: string]: any } = { xp: newXp };

        if (newLevelInfo.level > oldLevelInfo.level) {
            leveledUp = true;
            roomUpdates.level = newLevelInfo.level;
            roomUpdates.xpToNextLevel = newLevelInfo.xpToNextLevel;
        }
        transaction.update(roomRef, roomUpdates);
    }

    // Log transaction for sender
    await logTransaction(transaction, senderId, {
        type: 'gift_sent',
        amount: -gift.diamondCost,
        description: `${receiverName || 'Odaya'} gönderilen ${gift.name} hediyesi`,
        relatedUserId: receiverId,
        roomId: roomId,
        giftId: giftId,
    });

    // Create a system message in the chat to announce the gift
    const giftMessageData = {
      type: 'gift' as const,
      uid: 'system', // Gifts are system messages
      text: `${senderName}, ${receiverName ? `${receiverName}'a` : 'odaya'} bir ${gift.name} gönderdi!`,
      createdAt: serverTimestamp(),
      giftData: {
        senderName: senderName,
        senderLevel: newGiftLevel,
        receiverName: receiverName,
        giftId: giftId,
      },
    };
    transaction.set(doc(messagesRef), giftMessageData);
    
    // If the gift is the 'plane', open a portal
    if (gift.id === 'plane') {
      const currentRoomDoc = await transaction.get(roomRef); // re-get to have latest data
      if (currentRoomDoc.exists()) {
         await openPortalForRoom(roomId, senderId, transaction);
      }
    }
    
    // If room leveled up, add a system message
    if (leveledUp) {
        const newLevel = getRoomLevelInfo(roomData.xp + gift.diamondCost).level;
        await addSystemMessage(roomId, `🎉 Oda seviye atladı! Yeni Seviye: ${newLevel}`, transaction);
    }
    
    return { success: true };
  });
}

export async function convertProfileValueToDiamonds(userId: string) {
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");

    const userRef = doc(db, 'users', userId);
    
    return await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("Kullanıcı bulunamadı.");
        }

        const userData = userDoc.data();
        const profileValue = userData.profileValue || 0;

        if (profileValue <= 0) {
            throw new Error("Dönüştürülecek hediye değeri yok.");
        }
        
        // 70% conversion rate
        const diamondsToAdd = Math.floor(profileValue * 0.7);
        
        transaction.update(userRef, {
            profileValue: 0,
            diamonds: increment(diamondsToAdd)
        });

        await logTransaction(transaction, userId, {
            type: 'profile_value_conversion',
            amount: diamondsToAdd,
            description: 'Hediye değeri dönüştürme'
        });

        return { success: true, convertedAmount: diamondsToAdd };
    });
}