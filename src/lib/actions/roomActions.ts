// src/lib/actions/roomActions.ts
'use server';

import { db } from '@/lib/firebase';
import { deleteRoomWithSubcollections } from '@/lib/firestoreUtils';
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, writeBatch, arrayUnion, arrayRemove, updateDoc, runTransaction, increment, setDoc, query, where, getDocs } from 'firebase/firestore';
import { createNotification } from './notificationActions';
import type { Room, Message } from '../types';
import { createDmFromMatchRoom } from './dmActions';

const voiceStatsRef = doc(db, 'config', 'voiceStats');

export async function createRoom(
    userId: string,
    roomData: Pick<Room, 'name' | 'description' | 'requestToSpeakEnabled' | 'language'>,
    creatorInfo: { username: string, photoURL: string | null, role: string, selectedAvatarFrame: string }
) {
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");
    
    const userRef = doc(db, 'users', userId);
    const roomCost = 10;

    return await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
        
        const userData = userDoc.data();
        if ((userData.diamonds || 0) < roomCost) {
            throw new Error(`Oda oluşturmak için ${roomCost} elmasa ihtiyacınız var.`);
        }
        
        const newRoomRef = doc(collection(db, 'rooms'));
        const fifteenMinutesInMs = 15 * 60 * 1000;
        
        const newRoom: Omit<Room, 'id'> = {
            name: roomData.name,
            description: roomData.description,
            language: roomData.language,
            type: 'public',
            status: 'open',
            requestToSpeakEnabled: roomData.requestToSpeakEnabled,
            createdBy: {
                uid: userId,
                username: creatorInfo.username,
                photoURL: creatorInfo.photoURL,
                role: creatorInfo.role,
                selectedAvatarFrame: creatorInfo.selectedAvatarFrame,
            },
            moderators: [userId],
            createdAt: serverTimestamp() as Timestamp,
            participants: [{ uid: userId, username: creatorInfo.username, photoURL: creatorInfo.photoURL }],
            maxParticipants: 9,
            voiceParticipantsCount: 0,
            expiresAt: Timestamp.fromMillis(Date.now() + fifteenMinutesInMs),
            rules: null,
            welcomeMessage: null,
            pinnedMessageId: null,
        };

        transaction.set(newRoomRef, newRoom);
        transaction.update(userRef, { 
            diamonds: increment(-roomCost),
            lastActionTimestamp: serverTimestamp()
        });
        
        return { success: true, roomId: newRoomRef.id };
    });
}

interface UserInfo {
    uid: string;
    username: string;
    photoURL?: string | null;
}

export async function createPrivateMatchRoom(user1: UserInfo, user2: UserInfo) {
    const newRoomRef = doc(collection(db, 'rooms'));
    const oneHourInMs = 60 * 60 * 1000;
    const fiveMinutesInMs = 5 * 60 * 1000;

    const newRoom: Omit<Room, 'id'> = {
        name: `${user1.username} & ${user2.username}`,
        description: 'Özel eşleşme odası.',
        type: 'match',
        status: 'open',
        createdBy: { uid: user1.uid, username: user1.username, photoURL: user1.photoURL },
        moderators: [user1.uid, user2.uid],
        createdAt: serverTimestamp() as Timestamp,
        participants: [
            { uid: user1.uid, username: user1.username, photoURL: user1.photoURL },
            { uid: user2.uid, username: user2.username, photoURL: user2.photoURL }
        ],
        maxParticipants: 2,
        voiceParticipantsCount: 0,
        expiresAt: Timestamp.fromMillis(Date.now() + oneHourInMs),
        confirmationExpiresAt: Timestamp.fromMillis(Date.now() + fiveMinutesInMs),
        matchConfirmation: {
            [user1.uid]: 'pending',
            [user2.uid]: 'pending'
        },
        requestToSpeakEnabled: false,
        rules: null,
        welcomeMessage: `Hoş geldiniz! Eşleşme odanız oluşturuldu. Birbirinizi tanımak için 5 dakikanız var.`,
        pinnedMessageId: null,
    };
    
    await setDoc(newRoomRef, newRoom);
    return newRoomRef.id;
}


export async function addSystemMessage(roomId: string, text: string) {
    if (!roomId || !text) throw new Error("Oda ID'si ve mesaj metni gereklidir.");

    try {
        const messagesRef = collection(db, 'rooms', roomId, 'messages');
        const userRef = doc(db, 'users', 'system'); // Assuming a system user

        const batch = writeBatch(db);
        batch.set(doc(messagesRef), {
            type: 'system',
            text,
            createdAt: serverTimestamp(),
            uid: 'system',
            username: 'System',
        });
        
        await batch.commit();

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

export async function deleteMatchRoom(roomId: string) {
    await deleteRoomWithSubcollections(roomId);
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
    const userRef = doc(db, 'users', userId);
    const cost = 15;

    await runTransaction(db, async (transaction) => {
        const [roomDoc, userDoc] = await Promise.all([
            transaction.get(roomRef),
            transaction.get(userRef)
        ]);

        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
        
        const roomData = roomDoc.data();
        const userData = userDoc.data();
        
        const isHost = roomData.createdBy.uid === userId;
        const isModerator = roomData.moderators?.includes(userId);

        if (!isHost && !isModerator) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }

        if ((userData.diamonds || 0) < cost) {
            throw new Error(`Süre uzatmak için ${cost} elmasa ihtiyacınız var.`);
        }
        
        const currentExpiresAt = roomData.expiresAt ? (roomData.expiresAt as Timestamp).toMillis() : Date.now();
        const twentyMinutesInMs = 20 * 60 * 1000;
        const newExpiresAt = Timestamp.fromMillis(currentExpiresAt + twentyMinutesInMs);
        
        transaction.update(userRef, { diamonds: increment(-cost) });
        transaction.update(roomRef, { expiresAt: newExpiresAt });
    });
    
    await addSystemMessage(roomId, `⏰ Oda sahibi, oda süresini 20 dakika uzattı! Bu işlem ${cost} elmasa mal oldu.`);
    return { success: true };
}

export async function increaseParticipantLimit(roomId: string, userId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const userRef = doc(db, 'users', userId);
    const cost = 5;

    await runTransaction(db, async (transaction) => {
        const [roomDoc, userDoc] = await Promise.all([
            transaction.get(roomRef),
            transaction.get(userRef)
        ]);

        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
        
        const roomData = roomDoc.data();
        const userData = userDoc.data();

        if (roomData.createdBy.uid !== userId) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }
        if ((userData.diamonds || 0) < cost) {
            throw new Error(`Katılımcı limitini artırmak için ${cost} elmasa ihtiyacınız var.`);
        }
        
        transaction.update(userRef, { diamonds: increment(-cost) });
        transaction.update(roomRef, { maxParticipants: increment(1) });
    });

    const roomSnap = await getDoc(roomRef);
    const newLimit = roomSnap.data()?.maxParticipants;
    await addSystemMessage(roomId, `👤 Oda sahibi, katılımcı limitini ${newLimit}'e yükseltti! Bu işlem ${cost} elmasa mal oldu.`);
    return { success: true };
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
        const roomData = roomDoc.data();
        
        if (roomData.portalExpiresAt && (roomData.portalExpiresAt as Timestamp).toMillis() > Date.now()) {
            throw new Error("Bu oda için zaten aktif bir portal var.");
        }
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

export async function updateRoomDetails(roomId: string, userId: string, details: { rules?: string, welcomeMessage?: string }) {
    const roomRef = doc(db, 'rooms', roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists() || roomDoc.data().createdBy.uid !== userId) {
        throw new Error("Bu işlemi yapma yetkiniz yok.");
    }
    await updateDoc(roomRef, { ...details, hasDetails: !!(details.rules || details.welcomeMessage) });
    return { success: true };
}

export async function pinMessage(roomId: string, messageId: string, userId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists() || roomDoc.data().createdBy.uid !== userId) {
        throw new Error("Bu işlemi yapma yetkiniz yok.");
    }
    await updateDoc(roomRef, { pinnedMessageId: messageId });
    return { success: true };
}

export async function unpinMessage(roomId: string, userId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists() || roomDoc.data().createdBy.uid !== userId) {
        throw new Error("Bu işlemi yapma yetkiniz yok.");
    }
    await updateDoc(roomRef, { pinnedMessageId: null });
    return { success: true };
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
                return;
            }
            
            transaction.delete(targetUserVoiceRef);

            transaction.update(roomRef, { 
                voiceParticipantsCount: increment(-1) 
            });

            transaction.set(voiceStatsRef, { 
                totalUsers: increment(-1) 
            }, { merge: true });
        });
    } catch (error: any) {
        console.error("Error kicking user from voice:", error);
        throw new Error(error.message || "Could not kick user from voice.");
    }
}

export async function handleMatchConfirmation(roomId: string, userId: string, accepted: boolean) {
  const roomRef = doc(db, 'rooms', roomId);

  // Use a transaction to safely update the confirmation status
  const shouldConvert = await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists()) throw new Error("Eşleşme odası bulunamadı.");
    const roomData = roomDoc.data() as Room;

    if (roomData.status !== 'open') throw new Error("Bu eşleşme odası artık aktif değil.");
    if (roomData.matchConfirmation?.[userId] !== 'pending') throw new Error("Zaten bir seçim yaptınız.");

    const partnerId = roomData.participants.find(p => p.uid !== userId)!.uid;
    const partnerStatus = roomData.matchConfirmation?.[partnerId];

    if (!accepted) {
      transaction.update(roomRef, { status: 'closed_declined', [`matchConfirmation.${userId}`]: 'declined' });
      return false;
    }

    if (partnerStatus === 'accepted') {
      transaction.update(roomRef, { status: 'converting', [`matchConfirmation.${userId}`]: 'accepted' });
      return true; // Signal to convert
    } else {
      transaction.update(roomRef, { [`matchConfirmation.${userId}`]: 'accepted' });
      return false; // Wait for partner
    }
  });

  if (shouldConvert) {
    try {
      // Perform the migration outside the transaction
      const newChatId = await createDmFromMatchRoom(roomId);
      // Final update to signal redirection to clients
      await updateDoc(roomRef, {
        status: 'converted_to_dm',
        finalChatId: newChatId,
      });
    } catch (error) {
      console.error("Failed to convert match room:", error);
      await updateDoc(roomRef, { status: 'open' }); // Revert on failure
      throw new Error("Sohbet oluşturulurken bir hata oluştu.");
    }
  }

  return { success: true };
}
