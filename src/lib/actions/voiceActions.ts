// src/lib/actions/voiceActions.ts
'use server';

import { db } from '@/lib/firebase';
import { 
    collection, 
    doc, 
    writeBatch,
    runTransaction,
    getDoc,
    serverTimestamp,
    increment,
    updateDoc,
    Timestamp,
    deleteDoc,
    arrayRemove
} from 'firebase/firestore';
import type { Room, VoiceParticipant } from '../types';

interface UserInfo {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
}

/**
 * Kullanıcının bir odanın sesli sohbetine katılması için sunucu eylemi.
 * Bu, atomik bir işlemle kullanıcıyı ekler ve sayacı günceller.
 * @param roomId Katılınacak odanın ID'si.
 * @param user Katılan kullanıcı bilgileri.
 */
export async function joinVoiceChat(roomId: string, user: UserInfo) {
    if (!user || !user.uid) throw new Error("Yetkilendirme hatası: Giriş yapmalısınız.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(roomRef, 'voiceParticipants', user.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                throw new Error("Oda bulunamadı.");
            }
            
            const userVoiceDoc = await transaction.get(userVoiceRef);
            if (userVoiceDoc.exists()) {
                // User is already in chat, consider it a success.
                return;
            }

            const roomData = roomDoc.data() as Room;
            const voiceCount = roomData.voiceParticipantsCount || 0;
            if (voiceCount >= roomData.maxParticipants) {
                throw new Error("Sesli sohbet dolu.");
            }

            const isHost = roomData.createdBy.uid === user.uid;
            const participantData: VoiceParticipant = {
                uid: user.uid,
                username: user.displayName || 'Anonim',
                photoURL: user.photoURL,
                isSpeaker: true, 
                isMuted: false, // Kullanıcılar varsayılan olarak konuşabilir.
                joinedAt: serverTimestamp() as Timestamp,
            };
            
            transaction.set(userVoiceRef, participantData);
            transaction.update(roomRef, { voiceParticipantsCount: increment(1) });
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Sesli sohbete katılırken hata:", error);
        return { success: false, error: error.message };
    }
}


/**
 * Kullanıcının sesli sohbetten ayrılması için sunucu eylemi.
 * Kullanıcıyı hem sesli katılımcı listesinden hem de ana katılımcı listesinden siler.
 * @param roomId Ayrılınacak odanın ID'si.
 * @param userId Ayrılan kullanıcının ID'si.
 */
export async function leaveVoiceChat(roomId: string, userId: string) {
    if (!userId) throw new Error("Yetkilendirme hatası.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);

     try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                // Oda zaten silinmiş, yapacak bir şey yok.
                return;
            }

            const roomData = roomDoc.data() as Room;
            // Genel katılımcı listesinden silinecek tam nesneyi bul.
            const participantToRemove = (roomData.participants || []).find(p => p.uid === userId);
            const userVoiceDoc = await transaction.get(userVoiceRef);
            
            const updates: {[key: string]: any} = {};
            let needsUpdate = false;

            // Eğer kullanıcı sesli sohbet listesindeyse, onu sil ve sayacı azalt.
            if (userVoiceDoc.exists()) {
                transaction.delete(userVoiceRef);
                updates.voiceParticipantsCount = increment(-1);
                needsUpdate = true;
            }
            
            // Eğer kullanıcı ana katılımcı listesindeyse, oradan da sil.
            if (participantToRemove) {
                updates.participants = arrayRemove(participantToRemove);
                needsUpdate = true;
            }
            
            // Eğer herhangi bir değişiklik yapılacaksa, oda dökümanını tek seferde güncelle.
            if (needsUpdate) {
                transaction.update(roomRef, updates);
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error("Sesli sohbetten ayrılırken hata:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Kullanıcının kendi mikrofon durumunu (sessiz/sesli) değiştirmesi için sunucu eylemi.
 * @param roomId Oda ID'si.
 * @param userId İşlemi yapan kullanıcı ID'si.
 * @param isMuted Mikrofonun yeni durumu.
 */
export async function toggleSelfMute(roomId: string, userId: string, isMuted: boolean) {
    if (!userId) throw new Error("Yetkilendirme hatası.");

    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);
    
    try {
        await updateDoc(userVoiceRef, { 
            isMuted: isMuted,
            lastSpokeAt: serverTimestamp()
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// --- Yönetici (Host) Eylemleri ---

/**
 * Oda yöneticisinin bir katılımcıyı sesli sohbetten atması.
 * @param roomId Oda ID'si.
 * @param currentUserId İşlemi yapan yönetici ID'si.
 * @param targetUserId Atılacak kullanıcının ID'si.
 */
export async function kickFromVoice(roomId: string, currentUserId: string, targetUserId: string) {
    if (!currentUserId) throw new Error("Yetkilendirme hatası.");
    if (currentUserId === targetUserId) throw new Error("Kendinizi atamazsınız.");

    const roomRef = doc(db, 'rooms', roomId);
    const targetUserVoiceRef = doc(roomRef, 'voiceParticipants', targetUserId);

    try {
        await runTransaction(db, async (transaction) => {
             const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists() || roomDoc.data()?.createdBy.uid !== currentUserId) {
                throw new Error("Bu işlemi yapma yetkiniz yok.");
            }
            
            const roomData = roomDoc.data() as Room;
            const participantToRemove = (roomData.participants || []).find(p => p.uid === targetUserId);

            const targetUserDoc = await transaction.get(targetUserVoiceRef);
            if (!targetUserDoc.exists()) {
                return; // User already gone.
            }
            
            transaction.delete(targetUserVoiceRef);

            const updates: {[key: string]: any} = {
                voiceParticipantsCount: increment(-1)
            };

            if (participantToRemove) {
                updates.participants = arrayRemove(participantToRemove);
            }

            transaction.update(roomRef, updates);
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
