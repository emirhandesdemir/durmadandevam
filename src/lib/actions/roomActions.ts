// src/lib/actions/roomActions.ts
'use server';

import { db, storage } from '@/lib/firebase';
import { deleteRoomWithSubcollections } from '@/lib/firestoreUtils';
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, writeBatch, arrayUnion, arrayRemove, updateDoc, runTransaction, increment, setDoc, query, where, getDocs, orderBy, deleteField, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { createNotification } from './notificationActions';
import type { Room, Message, PlaylistTrack, UserProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { generateRoomResponse } from '@/ai/flows/roomChatFlow';

const voiceStatsRef = doc(db, 'config', 'voiceStats');

const BOT_USER_INFO = {
    uid: 'ai-bot-walk',
    username: 'Walk',
    photoURL: `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="url(#bot-grad)"/><rect x="25" y="45" width="50" height="20" rx="10" fill="white" fill-opacity="0.8"/><circle cx="50" cy="40" r="15" fill="white"/><circle cx="50" cy="40" r="10" fill="url(#eye-grad)"/><path d="M35 70 Q 50 80, 65 70" stroke="white" stroke-width="4" stroke-linecap="round" fill="none"/><defs><linearGradient id="bot-grad" x1="0" y1="0" x2="100" y2="100"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#3b82f6"/></linearGradient><radialGradient id="eye-grad"><stop offset="20%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#2563eb"/></radialGradient></defs></svg>`)}`,
    role: 'user' as 'user' | 'admin',
    selectedAvatarFrame: 'avatar-frame-tech'
};


// This function is not awaited in the main flow to avoid blocking UI.
export async function triggerBotResponse(roomId: string, messageAuthorId: string, messageText: string) {
    if (messageAuthorId === BOT_USER_INFO.uid) return;

    // Determine if the bot should respond
    const isMentioned = messageText.toLowerCase().includes('@walk');
    const isQuestion = messageText.includes('?');
    
    // Always respond if mentioned. Otherwise, respond based on probability.
    const shouldRespond = isMentioned || (isQuestion && Math.random() < 0.5) || Math.random() < 0.40;
    
    if (!shouldRespond) {
        return;
    }

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    const lastMessages = snapshot.docs.map(doc => doc.data() as Message).reverse();

    if (lastMessages.length === 0) return;

    const chatHistory = lastMessages.map(msg => ({
        role: msg.uid === BOT_USER_INFO.uid ? 'model' : 'user',
        content: `${msg.username}: ${msg.text || '(resim veya video gönderdi)'}`
    }));

    try {
        const aiResponse = await generateRoomResponse({ chatHistory });
        if (aiResponse) { // Response is now a direct string
            await addBotMessage(roomId, aiResponse);
        }
    } catch (error) {
        console.error("AI bot response error:", error);
    }
}

async function addBotMessage(roomId: string, text: string) {
    if (!roomId || !text.trim()) return;
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const botMessage = {
        type: 'user', // Appear as a user
        uid: BOT_USER_INFO.uid,
        username: BOT_USER_INFO.username,
        photoURL: BOT_USER_INFO.photoURL,
        text,
        createdAt: serverTimestamp(),
        selectedBubble: '',
        selectedAvatarFrame: BOT_USER_INFO.selectedAvatarFrame,
        role: BOT_USER_INFO.role,
    };
    await addDoc(messagesRef, botMessage);
}


export async function createEventRoom(
    creatorId: string,
    roomData: { name: string, description: string, language: string },
    creatorInfo: { username: string, photoURL: string | null, role: string, selectedAvatarFrame?: string }
) {
    if (!creatorId) throw new Error("Kullanıcı ID'si gerekli.");
    if (creatorInfo.role !== 'admin') throw new Error("Bu işlemi yapma yetkiniz yok.");

    const newRoomRef = doc(collection(db, 'rooms'));

    const newRoom: Omit<Room, 'id'> = {
        name: roomData.name,
        description: roomData.description,
        language: roomData.language,
        type: 'event', // Mark as an event room
        createdAt: serverTimestamp() as Timestamp,
        expiresAt: null, // Event rooms do not expire
        createdBy: {
            uid: creatorId,
            username: creatorInfo.username,
            photoURL: creatorInfo.photoURL,
            role: creatorInfo.role,
            selectedAvatarFrame: creatorInfo.selectedAvatarFrame || '',
        },
        moderators: [creatorId],
        participants: [],
        maxParticipants: 50, // Higher limit for events
        voiceParticipantsCount: 0,
        rules: null,
        welcomeMessage: null,
        pinnedMessageId: null,
    };

    await setDoc(newRoomRef, newRoom);
    return { success: true, roomId: newRoomRef.id };
}

export async function deleteEventRoom(roomId: string, adminId: string) {
    if (!roomId || !adminId) throw new Error("Gerekli bilgiler eksik.");
    
    const adminUserDoc = await getDoc(doc(db, 'users', adminId));
    if (!adminUserDoc.exists() || adminUserDoc.data().role !== 'admin') {
        throw new Error("Bu işlemi yapma yetkiniz yok.");
    }
    
    await deleteRoomWithSubcollections(roomId);
    
    return { success: true };
}

export async function createRoom(
    userId: string,
    roomData: { name: string, description: string, language: string },
    creatorInfo: { username: string, photoURL: string | null, role: string, selectedAvatarFrame?: string }
) {
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");
    
    const userRef = doc(db, 'users', userId);
    const roomCost = 10; // Sabit maliyet

    return await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
        
        const userData = userDoc.data();
        
        const unlimitedUntil = userData.unlimitedRoomCreationUntil as Timestamp | undefined;
        const isUnlimited = unlimitedUntil && unlimitedUntil.toDate() > new Date();

        if (!isUnlimited && (userData.diamonds || 0) < roomCost) {
            throw new Error(`Oda oluşturmak için ${roomCost} elmasa ihtiyacınız var.`);
        }
        
        const newRoomRef = doc(collection(db, 'rooms'));
        const durationInMs = 15 * 60 * 1000;
        
        const newRoom: Partial<Room> = {
            name: roomData.name,
            description: roomData.description,
            language: roomData.language,
            type: 'public',
            createdAt: serverTimestamp() as Timestamp,
            expiresAt: Timestamp.fromMillis(Date.now() + durationInMs),
            createdBy: {
                uid: userId,
                username: creatorInfo.username,
                photoURL: creatorInfo.photoURL,
                role: creatorInfo.role,
                selectedAvatarFrame: creatorInfo.selectedAvatarFrame || '',
            },
            moderators: [userId],
            participants: [],
            maxParticipants: 9,
            voiceParticipantsCount: 0,
            nextGameTimestamp: serverTimestamp() as Timestamp,
            rules: null,
            welcomeMessage: null,
            pinnedMessageId: null,
        };

        transaction.set(newRoomRef, newRoom);

        if (!isUnlimited) {
            transaction.update(userRef, { 
                diamonds: increment(-roomCost),
                lastActionTimestamp: serverTimestamp()
            });
        } else {
            transaction.update(userRef, { lastActionTimestamp: serverTimestamp() });
        }
        
        return { success: true, roomId: newRoomRef.id };
    });
}

interface UserInfo {
    uid: string;
    username: string;
    photoURL?: string | null;
}


export async function addSystemMessage(roomId: string, text: string) {
    if (!roomId || !text) throw new Error("Oda ID'si ve mesaj metni gereklidir.");

    try {
        const messagesRef = collection(db, 'rooms', roomId, 'messages');
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

        if (expiresAt && expiresAt.toMillis() <= Date.now() && roomData.type !== 'event') {
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
    
    const isExpired = roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date() && roomData.type !== 'event';
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
        type: 'user',
        uid: BOT_USER_INFO.uid,
        username: BOT_USER_INFO.username,
        photoURL: BOT_USER_INFO.photoURL,
        selectedAvatarFrame: BOT_USER_INFO.selectedAvatarFrame,
        text: `Hoş geldin, ${userInfo.username}!`,
        createdAt: serverTimestamp()
    });
    await batch.commit();
    return { success: true };
}

export async function leaveRoom(roomId: string, userId: string, username: string) {
    if (!roomId || !userId) throw new Error("Oda ve kullanıcı bilgisi gerekli.");

    const roomRef = doc(db, 'rooms', roomId);
    
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return;

        const roomData = roomDoc.data() as Room;

        const participantToRemove = roomData.participants?.find(p => p.uid === userId);
        if (participantToRemove) {
            transaction.update(roomRef, {
                participants: arrayRemove(participantToRemove)
            });

            const messagesRef = collection(db, 'rooms', roomId, 'messages');
            const leaveMessage = {
                type: 'system',
                text: `🏃 ${username || 'Bir kullanıcı'} odadan ayrıldı.`,
                createdAt: serverTimestamp(),
                uid: 'system',
                username: 'System',
            };
            transaction.set(doc(messagesRef), leaveMessage);
        }
    });

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
    
    await addSystemMessage(roomId, `⏰ Oda süresi 20 dakika uzatıldı! Bu işlem ${cost} elmasa mal oldu.`);
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
        
        const isHost = roomData.createdBy.uid === userId;
        const isModerator = roomData.moderators?.includes(userId);
        const isPremium = userData.premiumUntil && userData.premiumUntil.toDate() > new Date();

        if (!isHost && !isModerator) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }
        
        if (!isPremium && (userData.diamonds || 0) < cost) {
            throw new Error(`Katılımcı limitini artırmak için ${cost} elmasa ihtiyacınız var.`);
        }
        
        if (!isPremium) {
             transaction.update(userRef, { diamonds: increment(-cost) });
        }
        transaction.update(roomRef, { maxParticipants: increment(1) });
    });

    const roomSnap = await getDoc(roomRef);
    const newLimit = roomSnap.data()?.maxParticipants;
    await addSystemMessage(roomId, `👤 Oda sahibi/moderatörü, katılımcı limitini ${newLimit}'e yükseltti!`);
    return { success: true };
}


export async function openPortalForRoom(roomId: string, userId: string) {
    const cost = 100; // Şimdilik ücretsiz

    const userRef = doc(db, 'users', userId);
    const roomRef = doc(db, 'rooms', roomId);
    const portalRef = doc(db, 'portals', roomId);

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const roomDoc = await transaction.get(roomRef);
        const portalDoc = await transaction.get(portalRef);

        if (!userDoc.exists() || !roomDoc.exists()) throw new Error("Kullanıcı veya oda bulunamadı.");

        const userData = userDoc.data();
        const roomData = roomDoc.data();
        
        if (portalDoc.exists() && (portalDoc.data().expiresAt as Timestamp).toMillis() > Date.now()) {
            throw new Error("Bu oda için zaten aktif bir portal var.");
        }
        
        const fiveMinutesInMs = 5 * 60 * 1000;
        const newExpiresAt = Timestamp.fromMillis(Date.now() + fiveMinutesInMs);
        
        transaction.set(portalRef, {
            roomId: roomId,
            roomName: roomData.name,
            hostUid: userId,
            hostUsername: userData.username,
            createdAt: serverTimestamp(),
            expiresAt: newExpiresAt,
        });

        transaction.update(roomRef, { portalExpiresAt: newExpiresAt });

        const currentRoomMessagesRef = collection(db, "rooms", roomId, "messages");
        transaction.set(doc(currentRoomMessagesRef), {
            type: 'system',
            text: `✨ Bu odaya bir portal açıldı! 5 dakika boyunca tüm odalarda duyurulacak.`,
            createdAt: serverTimestamp(),
            uid: 'system',
            username: 'System',
        });

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

export async function deleteMessageByHost(roomId: string, messageId: string, hostId: string) {
    if (!roomId || !messageId || !hostId) {
        throw new Error("Gerekli parametreler eksik.");
    }

    const roomRef = doc(db, 'rooms', roomId);
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);

    return runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) {
            throw new Error("Oda bulunamadı.");
        }

        const roomData = roomDoc.data();
        if (roomData.createdBy.uid !== hostId) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }

        const messageDoc = await transaction.get(messageRef);
        if (messageDoc.exists()) {
            transaction.delete(messageRef);
        }

        return { success: true };
    });
}


// MUSIC ACTIONS
export async function addTrackToPlaylist(
    data: { roomId: string, fileName: string, fileDataUrl: string },
    userInfo: { uid: string, username: string }
) {
    if (!data.fileDataUrl) throw new Error("Dosya verisi gerekli.");
    if (!data.fileName) throw new Error("Dosya adı gerekli.");

    const { roomId, fileName, fileDataUrl } = data;

    const roomRef = doc(db, 'rooms', roomId);
    const playlistRef = collection(roomRef, 'playlist');
    
    const playlistSnapshot = await getDocs(playlistRef);
    if (playlistSnapshot.size >= 20) {
        throw new Error("Çalma listesi dolu (Maksimum 20 şarkı).");
    }

    const storagePath = `music/${roomId}/${uuidv4()}_${fileName}`;
    const musicStorageRef = ref(storage, storagePath);
    
    await uploadString(musicStorageRef, fileDataUrl, 'data_url');
    const fileUrl = await getDownloadURL(musicStorageRef);
    
    const newTrackDoc = doc(playlistRef);
    const newTrackData: Omit<PlaylistTrack, 'id'> = {
        name: fileName,
        fileUrl,
        storagePath,
        addedByUid: userInfo.uid,
        addedByUsername: userInfo.username,
        order: Date.now(),
        createdAt: serverTimestamp() as Timestamp,
    };
    await setDoc(newTrackDoc, newTrackData);
    
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.data()?.djUid) {
        await controlPlayback(roomId, userInfo.uid, { action: 'play' });
    }
    
    revalidatePath(`/rooms/${roomId}`);
    return { success: true };
}

export async function removeTrackFromPlaylist(roomId: string, trackId: string, userId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const trackRef = doc(roomRef, 'playlist', trackId);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        const trackDoc = await transaction.get(trackRef);

        if (!roomDoc.exists() || !trackDoc.exists()) throw new Error("Oda veya parça bulunamadı.");

        const roomData = roomDoc.data() as Room;
        const trackData = trackDoc.data() as PlaylistTrack;
        const isDj = roomData.djUid === userId;
        const isOwner = trackData.addedByUid === userId;

        if (!isDj && !isOwner) {
            throw new Error("Bu parçayı silme yetkiniz yok.");
        }

        transaction.delete(trackRef);
        // Optional: Delete from storage
        const fileStorageRef = ref(storage, trackData.storagePath);
        await deleteObject(fileStorageRef).catch(e => console.warn("Depolamadan dosya silinemedi:", e.message));

        // If the deleted track was the one playing, advance to the next track or stop
        const currentTrack = roomData.currentTrackIndex !== undefined ? roomData.currentTrackIndex : -1;
        const playlistSnapshot = await getDocs(query(collection(roomRef, 'playlist'), orderBy('order')));
        const playlist = playlistSnapshot.docs;
        const deletedTrackOrder = trackData.order;
        const oldIndex = playlist.findIndex(doc => doc.data().order === deletedTrackOrder);

        if (isDj && oldIndex === currentTrack) {
             if (playlist.length > 1) { // More tracks left after deletion
                const nextIndex = oldIndex % (playlist.length -1);
                const nextTrack = playlist[nextIndex]?.data();
                transaction.update(roomRef, {
                    currentTrackIndex: nextIndex,
                    currentTrackName: nextTrack?.name,
                });
             } else { // Last track deleted
                transaction.update(roomRef, {
                    djUid: null,
                    isMusicPlaying: false,
                    currentTrackIndex: -1,
                    currentTrackName: '',
                });
             }
        }
    });

    return { success: true };
}

export async function controlPlayback(roomId: string, userId: string, control: { action: 'play' | 'pause' | 'toggle' | 'skip', trackIndex?: number, direction?: 'next' | 'previous' }) {
    const roomRef = doc(db, 'rooms', roomId);
    const playlistRef = collection(roomRef, 'playlist');

    return runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        const roomData = roomDoc.data() as Room;
        const currentDj = roomData.djUid;

        if (currentDj && currentDj !== userId) {
            throw new Error("Başka bir kullanıcı şu anda DJ.");
        }
        
        const playlistSnapshot = await getDocs(query(playlistRef, orderBy('order')));
        const playlist = playlistSnapshot.docs.map(d => ({id: d.id, ...d.data() as Omit<PlaylistTrack, 'id'>}));
        
        if (playlist.length === 0) {
            transaction.update(roomRef, { djUid: null, isMusicPlaying: false, currentTrackIndex: -1, currentTrackName: '' });
            return;
        }

        let newIndex = roomData.currentTrackIndex !== undefined ? roomData.currentTrackIndex : -1;
        let newIsPlaying = roomData.isMusicPlaying || false;

        switch (control.action) {
            case 'play':
                newIsPlaying = true;
                if (control.trackIndex !== undefined) {
                    newIndex = control.trackIndex;
                } else if (newIndex === -1) {
                    newIndex = 0;
                }
                break;
            case 'pause':
                newIsPlaying = false;
                break;
            case 'toggle':
                newIsPlaying = !newIsPlaying;
                // If starting from scratch, become DJ and play first song
                if (newIsPlaying && !currentDj) {
                    newIndex = 0;
                }
                break;
            case 'skip':
                const direction = control.direction === 'next' ? 1 : -1;
                newIndex = (newIndex + direction + playlist.length) % playlist.length;
                newIsPlaying = true;
                break;
        }

        const newTrack = playlist[newIndex];
        transaction.update(roomRef, {
            djUid: userId,
            isMusicPlaying: newIsPlaying,
            currentTrackIndex: newIndex,
            currentTrackName: newTrack?.name || '',
        });
    });
}
