// src/lib/actions/diamondActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { createNotification } from './notificationActions';

export async function creditReferrer(referrerId: string) {
    if (!referrerId) return;

    const userRef = doc(db, 'users', referrerId);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                console.warn(`Referrer with ID ${referrerId} not found.`);
                return; // Silently fail if referrer doesn't exist
            }
            transaction.update(userRef, {
                diamonds: increment(10)
            });
        });
    } catch (error) {
        console.error("Error crediting referrer:", error);
    }
}


export async function sendDiamonds(senderId: string, receiverId: string, amount: number) {
    if (senderId === receiverId) throw new Error("Kendinize elmas gönderemezsiniz.");
    if (amount <= 0) throw new Error("Gönderilecek miktar pozitif olmalıdır.");
    
    const senderRef = doc(db, 'users', senderId);
    const receiverRef = doc(db, 'users', receiverId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const [senderDoc, receiverDoc] = await Promise.all([
                transaction.get(senderRef),
                transaction.get(receiverRef)
            ]);

            if (!senderDoc.exists() || !receiverDoc.exists()) {
                throw new Error("Kullanıcı bulunamadı.");
            }
            
            const senderData = senderDoc.data();
            const receiverData = receiverDoc.data();
            
            // Mutual follower check
            const senderFollowsReceiver = senderData.following?.includes(receiverId);
            const receiverFollowsSender = receiverData.following?.includes(senderId);

            if (!senderFollowsReceiver || !receiverFollowsSender) {
                throw new Error("Elmas göndermek için her iki kullanıcının da birbirini takip etmesi gerekir.");
            }
            
            if ((senderData.diamonds || 0) < amount) {
                throw new Error("Yetersiz elmas bakiyesi.");
            }
            
            // Perform the transfer
            transaction.update(senderRef, { diamonds: increment(-amount) });
            transaction.update(receiverRef, { diamonds: increment(amount) });
            
             // Create notification for the receiver
            await createNotification({
                recipientId: receiverId,
                senderId: senderId,
                senderUsername: senderData.username,
                senderAvatar: senderData.photoURL,
                senderAvatarFrame: senderData.selectedAvatarFrame,
                type: 'diamond_transfer',
                diamondAmount: amount,
            });
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error sending diamonds:", error);
        return { success: false, error: error.message };
    }
}
