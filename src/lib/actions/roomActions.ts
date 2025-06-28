// src/lib/actions/roomActions.ts
'use server';

import { db } from '@/lib/firebase';
import { deleteRoomWithSubcollections } from '@/lib/firestoreUtils';
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, writeBatch, arrayUnion, arrayRemove, updateDoc, increment, runTransaction, getDocs } from 'firebase/firestore';
import { createNotification } from './notificationActions';

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
    const cost = 100;

    const userRef = doc(db, 'users', userId);
    const roomRef = doc(db, 'rooms', roomId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const roomDoc = await transaction.get(roomRef);

            if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
            if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
            
            // TODO: Enable diamond cost later
            // const userData = userDoc.data();
            // if ((userData.diamonds || 0) < cost) {
            //     throw new Error(`Yeterli elmasınız yok. Gerekli: ${cost}`);
            // }
            // transaction.update(userRef, { diamonds: increment(-cost) });

            const fiveMinutesInMs = 5 * 60 * 1000;
            const newPortalExpiresAt = Timestamp.fromMillis(Date.now() + fiveMinutesInMs);
            transaction.update(roomRef, { portalExpiresAt: newPortalExpiresAt });

            // Add system message to the source room
            const messagesRef = collection(db, 'rooms', roomId, 'messages');
            const portalMessage = {
                type: 'system',
                text: `🚀 ${userDoc.data()?.username || 'Biri'} bu odaya bir portal açtı! Yeni misafirler bekleniyor.`,
                createdAt: serverTimestamp(),
                uid: 'system',
                username: 'System',
            };
            transaction.set(doc(messagesRef), portalMessage);
        });
    } catch (error: any) {
        console.error("Portal açma transaction hatası:", error);
        return { success: false, error: error.message };
    }
    
    try {
        const [userDoc, roomDoc] = await Promise.all([getDoc(userRef), getDoc(roomRef)]);
        const openerUsername = userDoc.data()?.username || 'Biri';
        const targetRoomName = roomDoc.data()?.name || 'bir odaya';
        
        const allRoomsQuery = collection(db, 'rooms');
        const allRoomsSnap = await getDocs(allRoomsQuery);

        const batch = writeBatch(db);

        allRoomsSnap.forEach(otherRoomDoc => {
            if (otherRoomDoc.id === roomId) return;

            const otherRoomData = otherRoomDoc.data();
            if (otherRoomData.expiresAt && (otherRoomData.expiresAt as Timestamp).toMillis() < Date.now()) return;

            const messagesRef = collection(db, 'rooms', otherRoomDoc.id, 'messages');
            const newPortalMessageRef = doc(messagesRef);
            
            batch.set(newPortalMessageRef, {
                type: 'portal',
                text: `${openerUsername}, "${targetRoomName}" odasına bir portal açtı!`,
                portalRoomId: roomId,
                createdAt: serverTimestamp(),
                uid: 'system',
                username: 'System'
            });
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Portal duyuru hatası:", error);
        return { success: true, warning: "Duyuru gönderilirken bir hata oluştu." };
    }
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
