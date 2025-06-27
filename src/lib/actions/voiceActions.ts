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
    writeBatch
} from 'firebase/firestore';
import { getGameSettings } from './gameActions';
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
            };
            
            transaction.set(userVoiceRef, participantData);
            transaction.update(roomRef, { voiceParticipantsCount: increment(1) });
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
        await updateDoc(userVoiceRef, { isMuted: isMuted });
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
 */
export async function kickFromVoice(roomId: string, currentUserId: string, targetUserId: string) {
    if (!currentUserId || currentUserId === targetUserId) return { success: false, error: "Geçersiz işlem." };

    const roomRef = doc(db, 'rooms', roomId);
    const targetUserVoiceRef = doc(roomRef, 'voiceParticipants', targetUserId);

    try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists() || roomDoc.data()?.createdBy.uid !== currentUserId) {
                throw new Error("Bu işlemi yapma yetkiniz yok.");
            }
            
            const targetUserDoc = await transaction.get(targetUserVoiceRef);
            if (!targetUserDoc.exists()) return;
            
            transaction.delete(targetUserVoiceRef);
            transaction.update(roomRef, { 
                voiceParticipantsCount: increment(-1),
                participants: arrayRemove((roomDoc.data() as Room).participants.find(p => p.uid === targetUserId))
            });
            transaction.set(voiceStatsRef, { totalUsers: increment(-1) }, { merge: true });
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Odadaki aktif olmayan kullanıcıları kontrol eder ve atar.
 */
export async function kickInactiveUsers(roomId: string) {
    const settings = await getGameSettings();
    const timeoutMinutes = settings.afkTimeoutMinutes || 8;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const now = Date.now();

    const voiceParticipantsRef = collection(db, 'rooms', roomId, 'voiceParticipants');
    
    try {
        const querySnapshot = await getDocs(voiceParticipantsRef);
        const batch = writeBatch(db);
        let kickedCount = 0;

        querySnapshot.forEach(doc => {
            const participant = doc.data() as VoiceParticipant;
            const lastActive = participant.lastActiveAt?.toMillis() || 0;
            if (now - lastActive > timeoutMs) {
                batch.delete(doc.ref);
                kickedCount++;
            }
        });

        if (kickedCount > 0) {
            const roomRef = doc(db, 'rooms', roomId);
            batch.update(roomRef, { voiceParticipantsCount: increment(-kickedCount) });
            batch.set(voiceStatsRef, { totalUsers: increment(-kickedCount) }, { merge: true });
            await batch.commit();
        }
        return { success: true, kickedCount };
    } catch (error) {
        console.error("AFK kullanıcıları atılırken hata:", error);
        return { success: false };
    }
}
