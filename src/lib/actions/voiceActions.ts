// src/lib/actions/voiceActions.ts
'use server';

import { db } from '@/lib/firebase';
import { 
    collection, 
    doc, 
    writeBatch,
    runTransaction,
    query,
    where,
    getDocs,
    limit,
    serverTimestamp,
    increment,
    deleteDoc
} from 'firebase/firestore';
import type { Room, VoiceParticipant } from '../types';

interface UserInfo {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
}

/**
 * Kullanıcının bir odanın sesli sohbetine katılması için sunucu eylemi.
 * @param roomId Katılınacak odanın ID'si.
 * @param user Katılan kullanıcı bilgileri.
 */
export async function joinVoiceChat(roomId: string, user: UserInfo) {
    if (!user || !user.uid) throw new Error("Yetkilendirme hatası: Giriş yapmalısınız.");

    const roomRef = doc(db, 'rooms', roomId);
    const voiceParticipantsRef = collection(roomRef, 'voiceParticipants');
    const userVoiceRef = doc(voiceParticipantsRef, user.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
            
            const roomData = roomDoc.data() as Room;
            const voiceCount = roomData.voiceParticipantsCount || 0;
            if (voiceCount >= 8) throw new Error("Sesli sohbet dolu.");

            // Katılımcının zaten olup olmadığını kontrol et
            const userDoc = await transaction.get(userVoiceRef);
            if (userDoc.exists()) {
                console.log("Kullanıcı zaten sesli sohbette.");
                return; // Zaten içeride, işlem yapma
            }
            
            const isHost = roomData.createdBy.uid === user.uid;
            
            // Yeni katılımcı belgesini oluştur
            transaction.set(userVoiceRef, {
                uid: user.uid,
                username: user.displayName || 'Anonim',
                photoURL: user.photoURL,
                isSpeaker: isHost, // Sadece host başlangıçta hoparlör olsun
                isMuted: !isHost, // Hoparlör değilse, başlangıçta sessizde
                joinedAt: serverTimestamp(),
                lastSpokeAt: serverTimestamp(),
            });

            // Oda belgesindeki katılımcı sayısını artır
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
 * @param roomId Ayrılınacak odanın ID'si.
 * @param userId Ayrılan kullanıcının ID'si.
 */
export async function leaveVoiceChat(roomId: string, userId: string) {
    if (!userId) throw new Error("Yetkilendirme hatası.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);

     try {
        await runTransaction(db, async (transaction) => {
             const userVoiceDoc = await transaction.get(userVoiceRef);
             if (!userVoiceDoc.exists()) return; // User already left, do nothing.

             // Kullanıcıyı sil
             transaction.delete(userVoiceRef);
             // Katılımcı sayısını azalt
             transaction.update(roomRef, { voiceParticipantsCount: increment(-1) });
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
        const batch = writeBatch(db);
        batch.update(userVoiceRef, { 
            isMuted: isMuted,
            // Kullanıcı sesini açtığında aktivite zamanını güncelle
            lastSpokeAt: serverTimestamp()
        });
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// --- Yönetici (Host) Eylemleri ---

/**
 * Oda yöneticisinin başka bir katılımcının hoparlör durumunu değiştirmesi.
 * @param roomId Oda ID'si.
 * @param currentUserId İşlemi yapan yönetici ID'si.
 * @param targetUserId Hedef kullanıcının ID'si.
 * @param isSpeaker Hedefin yeni hoparlör durumu.
 */
export async function updateSpeakerStatus(roomId: string, currentUserId: string, targetUserId: string, isSpeaker: boolean) {
    if (!currentUserId) throw new Error("Yetkilendirme hatası.");

    const roomRef = doc(db, 'rooms', roomId);
    const targetUserVoiceRef = doc(roomRef, 'voiceParticipants', targetUserId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists() || roomDoc.data()?.createdBy.uid !== currentUserId) {
                throw new Error("Bu işlemi yapma yetkiniz yok.");
            }

            const targetUserDoc = await transaction.get(targetUserVoiceRef);
            if (!targetUserDoc.exists()) {
                throw new Error("Hedef kullanıcı sesli sohbette değil.");
            }

            // Hedef kullanıcının durumunu güncelle
            transaction.update(targetUserVoiceRef, { 
                isSpeaker: isSpeaker,
                // Hoparlör yapılırsa sesi otomatik aç, dinleyici yapılırsa kapat
                isMuted: !isSpeaker 
            });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


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

            const targetUserDoc = await transaction.get(targetUserVoiceRef);
            if (!targetUserDoc.exists()) {
                return; // User already gone.
            }

            transaction.delete(targetUserVoiceRef);
            transaction.update(roomRef, { voiceParticipantsCount: increment(-1) });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
