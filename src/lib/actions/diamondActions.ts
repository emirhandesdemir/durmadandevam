
// src/lib/actions/diamondActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  increment,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { createNotification } from './notificationActions';

interface NewUserInfo {
    uid: string;
    username: string;
    photoURL: string;
}

export async function getDiamondsForAd(userId: string) {
    if (!userId) {
        throw new Error("Kullanıcı ID'si gerekli.");
    }
    const userRef = doc(db, 'users', userId);
    const adReward = 5;
    const cooldownSeconds = 60; // 1 minute cooldown

    return await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("Kullanıcı bulunamadı.");
        }

        const userData = userDoc.data();
        const lastAdWatched = userData.lastAdWatchedAt as Timestamp | undefined;

        if (lastAdWatched) {
            const secondsSinceLastAd = (Timestamp.now().seconds - lastAdWatched.seconds);
            if (secondsSinceLastAd < cooldownSeconds) {
                const timeLeft = cooldownSeconds - secondsSinceLastAd;
                throw new Error(`Yeni bir reklam izlemek için lütfen ${timeLeft} saniye bekleyin.`);
            }
        }
        
        transaction.update(userRef, {
            diamonds: increment(adReward),
            lastAdWatchedAt: serverTimestamp()
        });
        
        return { success: true, reward: adReward };
    }).catch(e => {
        throw new Error(e.message);
    });
}

export async function creditReferrer(referrerId: string, newUser: NewUserInfo) {
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
                diamonds: increment(10),
                referralCount: increment(1)
            });
        });

        // Send notification after the transaction is successful
        await createNotification({
            recipientId: referrerId,
            senderId: newUser.uid, // The new user is the "sender" of the event
            senderUsername: newUser.username,
            senderAvatar: newUser.photoURL,
            senderAvatarFrame: '', // New users don't have frames yet
            type: 'referral_bonus',
            diamondAmount: 10
        });

    } catch (error) {
        console.error("Error crediting referrer:", error);
        // Do not rethrow, as signup should succeed even if this fails
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
