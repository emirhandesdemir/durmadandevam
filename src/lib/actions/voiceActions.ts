// src/lib/actions/voiceActions.ts
'use server';

import { db } from '@/lib/firebase';
import { 
    collection, 
    doc, 
    runTransaction,
    getDoc,
    serverTimestamp,
    increment,
    updateDoc,
    Timestamp,
    deleteDoc,
    arrayRemove,
    getDocs,
    writeBatch,
    arrayUnion,
    query,
    where
} from 'firebase/firestore';
import type { Room, VoiceParticipant } from '../types';

interface UserInfo {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
}

const voiceStatsRef = doc(db, 'config', 'voiceStats');

/**
 * Kullanıcının bir odanın sesli sohbetine katılması için sunucu eylemi.
 */
export async function joinVoiceChat(roomId: string, user: UserInfo) {
    if (!user || !user.uid) throw new Error("Yetkilendirme hatası: Giriş yapmalısınız.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(roomRef, 'voiceParticipants', user.uid);
    const userDbRef = doc(db, 'users', user.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const [roomDoc, userVoiceDoc, userDbDoc] = await Promise.all([
                transaction.get(roomRef),
                transaction.get(userVoiceRef),
                transaction.get(userDbRef)
            ]);

            if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
            if (userVoiceDoc.exists()) return;
            if (!userDbDoc.exists()) throw new Error("Kullanıcı profili bulunamadı.");
            
            const userData = userDbDoc.data();
            const roomData = roomDoc.data() as Room;
            const voiceCount = roomData.voiceParticipantsCount || 0;
            if (voiceCount >= roomData.maxParticipants) throw new Error("Sesli sohbet dolu.");

            const participantData: Omit<VoiceParticipant, 'isSpeaker'> = {
                uid: user.uid,
                username: user.displayName || 'Anonim',
                photoURL: user.photoURL,
                isMuted: false,
                isSharingScreen: false,
                joinedAt: serverTimestamp() as Timestamp,
                lastActiveAt: serverTimestamp() as Timestamp,
                selectedBubble: userData.selectedBubble || '',
                selectedAvatarFrame: userData.selectedAvatarFrame || '',
            };
            
            transaction.set(userVoiceRef, participantData);

            const isAlreadyParticipant = roomData.participants?.some(p => p.uid === user.uid);
            const roomUpdates: { [key: string]: any } = { voiceParticipantsCount: increment(1) };
            if (!isAlreadyParticipant) {
                roomUpdates.participants = arrayUnion({
                    uid: user.uid,
                    username: user.displayName || 'Anonim',
                    photoURL: user.photoURL,
                });
            }

            transaction.update(roomRef, roomUpdates);
            transaction.set(voiceStatsRef, { totalUsers: increment(1) }, { merge: true });
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Sesli sohbete katılırken hata:", error);
        return { success: false, error: error.message };
    }
}


/**
 * Kullanıcının sesli sohbetten ayrılması için sunucu eylemi.
 */
export async function leaveVoiceChat(roomId: string, userId: string) {
    if (!userId) throw new Error("Yetkilendirme hatası.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);

     try {
        await runTransaction(db, async (transaction) => {
            const [roomDoc, userVoiceDoc] = await Promise.all([
                transaction.get(roomRef),
                transaction.get(userVoiceRef)
            ]);
            
            if (userVoiceDoc.exists()) {
                transaction.delete(userVoiceRef);
                if (roomDoc.exists()) {
                    transaction.update(roomRef, { voiceParticipantsCount: increment(-1) });
                }
                transaction.set(voiceStatsRef, { totalUsers: increment(-1) }, { merge: true });
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error("Sesli sohbetten ayrılırken hata:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Kullanıcının kendi mikrofon durumunu günceller.
 */
export async function toggleSelfMute(roomId: string, userId: string, isMuted: boolean) {
    if (!userId) throw new Error("Yetkilendirme hatası.");
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);
    try {
        await updateDoc(userVoiceRef, { 
            isMuted: isMuted,
            lastActiveAt: serverTimestamp() // Unmuting is an activity
        });
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

/**
 * Kullanıcının ekran paylaşım durumunu günceller.
 */
export async function toggleScreenShare(roomId: string, userId: string, isSharing: boolean) {
    if (!userId) throw new Error("Yetkilendirme hatası.");
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);
    try {
        await updateDoc(userVoiceRef, { isSharingScreen: isSharing });
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

/**
 * Kullanıcının son aktif zamanını günceller.
 */
export async function updateLastActive(roomId: string, userId: string) {
    if (!userId) return;
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);
    try {
        await updateDoc(userVoiceRef, { lastActiveAt: serverTimestamp() });
    } catch (error) { console.error("Aktivite güncellenirken hata:", error); }
}

/**
 * Oda yöneticisinin bir katılımcıyı sesli sohbetten atması.
 * Bu işlem artık kullanıcıyı odanın ana katılımcı listesinden ÇIKARMAZ.
 */
export async function kickFromVoice(roomId: string, currentUserId: string, targetUserId: string) {
    if (!currentUserId || currentUserId === targetUserId) return { success: false, error: "Geçersiz işlem." };

    const roomRef = doc(db, 'rooms', roomId);
    const targetUserVoiceRef = doc(roomRef, 'voiceParticipants', targetUserId);

    try {
        await runTransaction(db, async (transaction) => {
             const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
            const roomData = roomDoc.data() as Room;

            const isHost = roomData.createdBy.uid === currentUserId;
            const isModerator = roomData.moderators?.includes(currentUserId);

            if (!isHost && !isModerator) {
                 throw new Error("Bu işlemi yapma yetkiniz yok.");
            }
            
            const targetUserDoc = await transaction.get(targetUserVoiceRef);
            if (!targetUserDoc.exists()) return;
            
            transaction.delete(targetUserVoiceRef);
            transaction.update(roomRef, { voiceParticipantsCount: increment(-1) });
            transaction.set(voiceStatsRef, { totalUsers: increment(-1) }, { merge: true });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
