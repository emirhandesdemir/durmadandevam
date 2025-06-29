// src/lib/actions/roomActions.ts
'use server';

import { db } from '@/lib/firebase';
import { deleteRoomWithSubcollections } from '@/lib/firestoreUtils';
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, writeBatch, arrayUnion, arrayRemove, updateDoc, runTransaction, increment } from 'firebase/firestore';
import { createNotification } from './notificationActions';
import type { Room } from '../types';

const voiceStatsRef = doc(db, 'config', 'voiceStats');

export async function addSystemMessage(roomId: string, text: string) {
    if (!roomId || !text) throw new Error("Oda ID'si ve mesaj metni gereklidir.");

    try {
        const messagesRef = collection(db, 'rooms', roomId, 'messages');
        await addDoc(messagesRef, {
            type: 'system',
            text,
            createdAt: serverTimestamp(),
            uid: 'system',
            username: 'System',
        });
        return { success: true };
    } catch (error: any) {
        console.error("Sistem mesajı gönderilirken hata:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteRoomAsOwner(roomId: string, userId: string) {
    if (!roomId || !userId) throw new Error("Oda ID'si ve kullanıcı ID'si gereklidir.");

    const roomRef = doc(db, 'rooms', roomId);
    
    try {
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) {
            return { success: true, message: "Oda zaten silinmiş." };
        }

        if (roomDoc.data().createdBy.uid !== userId) {
            throw new Error("Bu odayı silme yetkiniz yok.");
        }

        await deleteRoomWithSubcollections(roomId);

        return { success: true };

    } catch (error: any) {
        console.error("Oda silinirken hata:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteExpiredRoom(roomId: string) {
    if (!roomId) throw new Error("Oda ID'si gereklidir.");

    const roomRef = doc(db, 'rooms', roomId);

    try {
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) {
            return { success: true, message: "Oda zaten silinmiş." };
        }

        const roomData = roomDoc.data();
        const expiresAt = roomData.expiresAt as Timestamp | undefined;

        if (expiresAt && expiresAt.toMillis() <= Date.now()) {
            await deleteRoomWithSubcollections(roomId);
            return { success: true, message: "Süresi dolan oda başarıyla silindi." };
        } else {
            return { success: false, error: "Odanın süresi henüz dolmadı." };
        }

    } catch (error: any) {
        console.error("Süresi dolan oda silinirken hata:", error);
        return { success: false, error: error.message };
    }
}

interface UserInfo {
    uid: string;
    username: string | null;
    photoURL: string | null;
}

export async function joinRoom(roomId: string, userInfo: UserInfo) {
    if (!userInfo || !userInfo.uid) {
        throw new Error("Giriş yapmış bir kullanıcı gereklidir.");
    }
    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error("Oda bulunamadı.");
    const roomData = roomSnap.data();
    
    const isExpired = roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date();
    if(isExpired) throw new Error("Bu odanın süresi dolmuş.");

    const isFull = (roomData.participants?.length || 0) >= roomData.maxParticipants;
    if (isFull) throw new Error("Bu oda dolu.");

    const isParticipant = roomData.participants?.some((p: any) => p.uid === userInfo.uid);
    if (isParticipant) return { success: true, message: "Zaten katılımcı." };

    const batch = writeBatch(db);
    batch.update(roomRef, {
        participants: arrayUnion({
            uid: userInfo.uid,
            username: userInfo.username || "Anonim",
            photoURL: userInfo.photoURL || null
        })
    });
    const messagesRef = collection(db, "rooms", roomId, "messages");
    batch.set(doc(messagesRef), {
        type: 'system',
        text: `👋 ${userInfo.username || 'Bir kullanıcı'} odaya katıldı.`,
        createdAt: serverTimestamp(), 
        uid: 'system', 
        username: 'System',
    });
    await batch.commit();
    return { success: true };
}

export async function sendRoomInvite(
  roomId: string,
  roomName: string,
  inviter: { uid: string, username: string | null, photoURL: string | null, selectedAvatarFrame?: string },
  inviteeId: string
) {
  if (!roomId || !inviter || !inviteeId) throw new Error("Eksik bilgi: Davet gönderilemedi.");
  if (inviter.uid === inviteeId) throw new Error("Kendinizi davet edemezsiniz.");
  
  await createNotification({
    recipientId: inviteeId,
    senderId: inviter.uid,
    senderUsername: inviter.username || "Biri",
    senderAvatar: inviter.photoURL,
    senderAvatarFrame: inviter.selectedAvatarFrame,
    type: 'room_invite',
    roomId: roomId,
    roomName: roomName,
  });
  return { success: true };
}

export async function extendRoomTime(roomId: string, userId: string) {
    const roomRef = doc(db, 'rooms', roomId);

    const roomDoc = await getDoc(roomRef);

    if (!roomDoc.exists()) {
        throw new Error("Oda bulunamadı.");
    }

    const roomData = roomDoc.data();
    if (roomData.createdBy.uid !== userId) {
        throw new Error("Bu işlemi yapma yetkiniz yok.");
    }
    
    const currentExpiresAt = roomData.expiresAt ? (roomData.expiresAt as Timestamp).toMillis() : Date.now();
    const tenMinutesInMs = 10 * 60 * 1000;
    const newExpiresAt = Timestamp.fromMillis(currentExpiresAt + tenMinutesInMs);
    
    await updateDoc(roomRef, {
        expiresAt: newExpiresAt
    });
    
    await addSystemMessage(roomId, "⏰ Oda sahibi, oda süresini 10 dakika uzattı!");

    return { success: true, newExpiresAt };
}

export async function openPortalForRoom(roomId: string, userId: string) {
    const cost = 100; // Şimdilik ücretsiz

    const userRef = doc(db, 'users', userId);
    const roomRef = doc(db, 'rooms', roomId);
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const roomDoc = await transaction.get(roomRef);

        if (!userDoc.exists() || !roomDoc.exists()) throw new Error("Kullanıcı veya oda bulunamadı.");

        const userData = userDoc.data();
        // if (userData.diamonds < cost) throw new Error("Yeterli elmasınız yok.");

        const fiveMinutesInMs = 5 * 60 * 1000;
        const newExpiresAt = Timestamp.fromMillis(Date.now() + fiveMinutesInMs);
        
        // transaction.update(userRef, { diamonds: increment(-cost) });
        transaction.update(roomRef, { portalExpiresAt: newExpiresAt });

        const systemMessage = {
            type: 'portal',
            text: `✨ ${roomDoc.data().createdBy.username}, "${roomDoc.data().name}" odasına bir portal açtı!`,
            createdAt: serverTimestamp(),
            uid: 'system',
            username: 'System',
            portalRoomId: roomId,
            portalRoomName: roomDoc.data().name
        };
        
        // Bu mesajı tüm diğer aktif odalara gönder (Burası karmaşıklaşabilir)
        // Şimdilik sadece bu odaya ve belki ana akışa bir bildirim olarak ekleyebiliriz.
        // Bu örnekte, diğer odalara yayma kısmını basitleştiriyoruz ve sadece mevcut odaya bilgi veriyoruz.
        // Gerçek bir senaryoda, bu bir Cloud Function ile tüm odaları gezerek yapılmalıdır.
        const messagesRef = collection(db, "rooms", roomId, "messages");
        transaction.set(doc(messagesRef), systemMessage);
    });

    return { success: true };
}


export async function updateModerators(roomId: string, targetUserId: string, action: 'add' | 'remove') {
    const roomRef = doc(db, 'rooms', roomId);
    try {
        await updateDoc(roomRef, {
            moderators: action === 'add' ? arrayUnion(targetUserId) : arrayRemove(targetUserId)
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateRoomSettings(roomId: string, settings: { requestToSpeakEnabled: boolean }) {
    if (!roomId) throw new Error("Oda ID'si gerekli.");
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, settings);
    return { success: true };
}

export async function requestToSpeak(roomId: string, user: UserInfo) {
    if (!roomId || !user.uid) throw new Error("Gerekli bilgi eksik.");
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, { speakRequests: arrayUnion(user.uid) });
    return { success: true };
}

export async function manageSpeakingPermission(roomId: string, targetUserId: string, allow: boolean) {
    if (!roomId || !targetUserId) throw new Error("Gerekli bilgi eksik.");
    
    const batch = writeBatch(db);
    const roomRef = doc(db, 'rooms', roomId);
    const participantRef = doc(roomRef, 'voiceParticipants', targetUserId);

    // Remove user from the request list regardless of action
    batch.update(roomRef, { speakRequests: arrayRemove(targetUserId) });
    // Update their permission
    batch.update(participantRef, { canSpeak: allow });

    await batch.commit();
    return { success: true };
}

/**
 * Kicks a user from the voice chat of a room by the host or a moderator.
 * This action only removes them from the voice subcollection, not the main participants list.
 * @param roomId The ID of the room.
 * @param currentUserId The ID of the user performing the action (host/moderator).
 * @param targetUserId The ID of the user to be kicked.
 */
export async function kickFromVoice(roomId: string, currentUserId: string, targetUserId:string) {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
        throw new Error("Invalid operation.");
    }

    const roomRef = doc(db, 'rooms', roomId);
    const targetUserVoiceRef = doc(roomRef, 'voiceParticipants', targetUserId);
    const voiceStatsRef = doc(db, 'config', 'voiceStats');

    try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                throw new Error("Room not found.");
            }
            const roomData = roomDoc.data() as Room;

            const isHost = roomData.createdBy.uid === currentUserId;
            const isModerator = roomData.moderators?.includes(currentUserId);

            if (!isHost && !isModerator) {
                throw new Error("You do not have permission to perform this action.");
            }
            
            const targetUserDoc = await transaction.get(targetUserVoiceRef);
            if (!targetUserDoc.exists()) {
                // User is already gone, nothing to do.
                return;
            }
            
            // Delete the user from voice participants
            transaction.delete(targetUserVoiceRef);

            // Decrement the voice participant count
            transaction.update(roomRef, { 
                voiceParticipantsCount: increment(-1) 
            });

            // Decrement the global voice stats
            transaction.set(voiceStatsRef, { 
                totalUsers: increment(-1) 
            }, { merge: true });
        });
    } catch (error: any) {
        console.error("Error kicking user from voice:", error);
        throw new Error(error.message || "Could not kick user from voice.");
    }
}
