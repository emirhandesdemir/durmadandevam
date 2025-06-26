// src/lib/actions/voiceActions.ts
'use server';

import { auth } from '@/lib/firebase';
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
import type { Room } from '../types';

/**
 * Kullanıcının bir odanın sesli sohbetine katılması için sunucu eylemi.
 * @param roomId Katılınacak odanın ID'si.
 */
export async function joinVoiceChat(roomId: string) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Yetkilendirme hatası: Giriş yapmalısınız.");

    const roomRef = doc(db, 'rooms', roomId);
    const voiceParticipantsRef = collection(roomRef, 'voiceParticipants');
    const userVoiceRef = doc(voiceParticipantsRef, currentUser.uid);

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
            
            // Hoparlör sayısını kontrol et
            const speakersQuery = query(voiceParticipantsRef, where("isSpeaker", "==", true));
            const speakersSnapshot = await getDocs(speakersQuery);
            const canBeSpeaker = speakersSnapshot.size < 2;

            // Yeni katılımcı belgesini oluştur
            transaction.set(userVoiceRef, {
                uid: currentUser.uid,
                username: currentUser.displayName || 'Anonim',
                photoURL: currentUser.photoURL,
                isSpeaker: canBeSpeaker,
                isMuted: !canBeSpeaker, // Hoparlör değilse, başlangıçta sessizde
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
 */
export async function leaveVoiceChat(roomId: string) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Yetkilendirme hatası.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', currentUser.uid);

    try {
        const batch = writeBatch(db);
        // Kullanıcıyı sil
        batch.delete(userVoiceRef);
        // Katılımcı sayısını azalt
        batch.update(roomRef, { voiceParticipantsCount: increment(-1) });
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Sesli sohbetten ayrılırken hata:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Kullanıcının kendi mikrofon durumunu (sessiz/sesli) değiştirmesi için sunucu eylemi.
 * @param roomId Oda ID'si.
 * @param isMuted Mikrofonun yeni durumu.
 */
export async function toggleSelfMute(roomId: string, isMuted: boolean) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Yetkilendirme hatası.");

    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', currentUser.uid);
    
    try {
        const batch = writeBatch(db);
        batch.update(userVoiceRef, { 
            isMuted: isMuted,
            // Kullanıcı sesini açtığında aktivite zamanını güncelle
            lastSpokeAt: isMuted ? serverTimestamp() : serverTimestamp()
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
 * @param targetUserId Hedef kullanıcının ID'si.
 * @param isSpeaker Hedefin yeni hoparlör durumu.
 */
export async function updateSpeakerStatus(roomId: string, targetUserId: string, isSpeaker: boolean) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Yetkilendirme hatası.");

    const roomRef = doc(db, 'rooms', roomId);
    const targetUserVoiceRef = doc(roomRef, 'voiceParticipants', targetUserId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists() || roomDoc.data()?.createdBy.uid !== currentUser.uid) {
                throw new Error("Bu işlemi yapma yetkiniz yok.");
            }

            if (isSpeaker) {
                // Eğer birini hoparlör yapıyorsak, mevcut hoparlör sayısını kontrol et
                const speakersQuery = query(collection(roomRef, 'voiceParticipants'), where("isSpeaker", "==", true));
                const speakersSnapshot = await getDocs(speakersQuery);
                if (speakersSnapshot.size >= 2) {
                    throw new Error("Aynı anda en fazla 2 kişi konuşabilir.");
                }
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
 * @param targetUserId Atılacak kullanıcının ID'si.
 */
export async function kickFromVoice(roomId: string, targetUserId: string) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Yetkilendirme hatası.");
    if (currentUser.uid === targetUserId) throw new Error("Kendinizi atamazsınız.");

    const roomRef = doc(db, 'rooms', roomId);
    const targetUserVoiceRef = doc(roomRef, 'voiceParticipants', targetUserId);

    try {
        await runTransaction(db, async (transaction) => {
             const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists() || roomDoc.data()?.createdBy.uid !== currentUser.uid) {
                throw new Error("Bu işlemi yapma yetkiniz yok.");
            }

            transaction.delete(targetUserVoiceRef);
            transaction.update(roomRef, { voiceParticipantsCount: increment(-1) });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
