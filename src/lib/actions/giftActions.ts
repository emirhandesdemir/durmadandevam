// src/lib/actions/giftActions.ts
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, increment, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { getGiftById, getRoomLevelInfo } from '../gifts';
import { logTransaction } from './transactionActions';
import { openPortalForRoom } from './roomActions';
import { addSystemMessage } from './roomActions';


interface SendGiftArgs {
  roomId?: string | null;
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
  if (!senderId || !giftId) {
    throw new Error('Gerekli bilgiler eksik.');
  }
   if (!roomId && !receiverId) {
    throw new Error('Hediye için bir alıcı (oda veya kullanıcı) belirtilmelidir.');
  }

  const gift = getGiftById(giftId);
  if (!gift) {
    throw new Error('Geçersiz hediye IDsi.');
  }

  const senderRef = doc(db, 'users', senderId);
  const receiverRef = receiverId ? doc(db, 'users', receiverId) : null;
  const roomRef = roomId ? doc(db, 'rooms', roomId) : null;

  return await runTransaction(db, async (transaction) => {
    // --- 1. ALL READS FIRST ---
    const senderDoc = await transaction.get(senderRef);
    if (!senderDoc.exists()) throw new Error("Gönderen kullanıcı bulunamadı.");
    const senderData = senderDoc.data();
    
    let receiverDoc = null;
    if (receiverRef) {
      receiverDoc = await transaction.get(receiverRef);
      if (!receiverDoc.exists()) throw new Error('Hediye alıcısı bulunamadı.');
    }

    let roomDoc = null;
    if (roomRef) {
        roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error('Oda bulunamadı.');
    }
    const roomData = roomDoc?.data();

    // --- 2. LOGIC AND PREPARATION ---
    const isAdmin = senderData.role === 'admin';
    if (!isAdmin && (senderData.diamonds || 0) < gift.diamondCost) {
      throw new Error('Yetersiz elmas bakiyesi.');
    }
    
    // NEW: Check for gift level requirement if sending to a specific user
    if (receiverId && !isAdmin && (senderData.giftLevel || 0) < 3) {
      throw new Error("Bir kullanıcıya doğrudan hediye gönderebilmek için 3. Seviye olmalısınız.");
    }

    const newTotalDiamondsSent = (senderData.totalDiamondsSent || 0) + gift.diamondCost;
    const newGiftLevel = getGiftLevel(newTotalDiamondsSent);
    const receiverName = receiverDoc?.data()?.username || null;
    let leveledUp = false;
    
    const senderUpdates: { [key: string]: any } = {
        totalDiamondsSent: newTotalDiamondsSent
    };
    if (!isAdmin) {
        senderUpdates.diamonds = increment(-gift.diamondCost);
    }
    if (newGiftLevel > (senderData.giftLevel || 0)) {
        senderUpdates.giftLevel = newGiftLevel;
    }

    // --- 3. ALL WRITES LAST ---
    transaction.update(senderRef, senderUpdates);

    // If it's a gift to a specific user, increment their profile value
    if (receiverRef && receiverDoc) {
      transaction.update(receiverRef, { profileValue: increment(gift.diamondCost) });
      await logTransaction(transaction, receiverId!, {
            type: 'gift_received',
            amount: gift.diamondCost,
            description: `${senderName} kullanıcısından ${gift.name} hediyesi`,
            relatedUserId: senderId,
            giftId: giftId,
       });
    } else if (roomRef && roomData) {
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
    
    if (!isAdmin) {
        await logTransaction(transaction, senderId, {
            type: 'gift_sent',
            amount: -gift.diamondCost,
            description: `${receiverName || 'Odaya'} gönderilen ${gift.name} hediyesi`,
            relatedUserId: receiverId,
            roomId: roomId,
            giftId: giftId,
        });
    }

    if (roomId) {
        const messagesRef = collection(db, 'rooms', roomId, 'messages');
        const giftMessageData = {
          type: 'gift' as const,
          uid: 'system',
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
        
        if (gift.id === 'plane' && roomRef) {
          await openPortalForRoom(roomId, senderId, transaction);
        }
        
        if (leveledUp && roomRef) {
            const updatedRoomData = (await transaction.get(roomRef)).data();
            const newLevel = getRoomLevelInfo(updatedRoomData!.xp).level;
            await addSystemMessage(roomId, `🎉 Oda seviye atladı! Yeni Seviye: ${newLevel}`, transaction);
        }
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
