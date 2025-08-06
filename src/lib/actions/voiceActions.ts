
      
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
    setDoc
} from 'firebase/firestore';
import type { Room, VoiceParticipant } from '../types';

interface UserInfo {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    profileEmoji: string | null;
    selectedAvatarFrame?: string;
}

const voiceStatsRef = doc(db, 'config', 'voiceStats');

/**
 * Kullanıcının bir odanın sesli sohbetine katılması için sunucu eylemi.
 */
export async function joinVoiceChat(roomId: string, user: UserInfo, options: { initialMuteState: boolean }) {
    if (!user || !user.uid) throw new Error("Yetkilendirme hatası: Giriş yapmalısınız.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(roomRef, 'voiceParticipants', user.uid);
    const userDbRef = doc(db, 'users', user.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const [roomDoc, userDbDoc, userVoiceDoc] = await Promise.all([
                transaction.get(roomRef),
                transaction.get(userDbRef),
                transaction.get(userVoiceRef),
            ]);
            
            if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
            if (!userDbDoc.exists()) throw new Error("Kullanıcı profili bulunamadı.");
            
            const roomData = roomDoc.data() as Room;
            const isExpired = roomData.type !== 'event' && roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date();
            if(isExpired) throw new Error("Bu odanın süresi dolmuş.");
            
            if (userVoiceDoc.exists()) return;

            const userData = userDbDoc.data();
            const voiceCount = roomData.voiceParticipantsCount || 0;
            if (voiceCount >= roomData.maxParticipants) throw new Error("Sesli sohbet dolu.");
            
            const participantData: Omit<VoiceParticipant, 'isSpeaker'> = {
                uid: user.uid,
                username: userData.username || 'Anonim',
                photoURL: userData.photoURL || null,
                profileEmoji: userData.profileEmoji || null,
                role: userData.role || 'user',
                giftLevel: userData.giftLevel || 0,
                isMuted: options.initialMuteState,
                isSharingScreen: false,
                isSharingVideo: false,
                canSpeak: true,
                joinedAt: serverTimestamp() as Timestamp,
                lastActiveAt: serverTimestamp() as Timestamp,
                selectedBubble: userData.selectedBubble || '',
                selectedAvatarFrame: userData.selectedAvatarFrame || '',
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
export async function leaveVoice(roomId: string, userId: string) {
    if (!userId) throw new Error("Yetkilendirme hatası.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);
    const userDbRef = doc(db, 'users', userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userVoiceDoc = await transaction.get(userVoiceRef);

            if (userVoiceDoc.exists()) {
                transaction.delete(userVoiceRef);
                transaction.update(roomRef, { voiceParticipantsCount: increment(-1) });
                transaction.set(voiceStatsRef, { totalUsers: increment(-1) }, { merge: true });
                transaction.update(userDbRef, { activeRoomId: null, activeRoomName: null });
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
            lastActiveAt: serverTimestamp()
        });
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

/**
 * Kullanıcının video durumunu günceller.
 */
export async function updateVideoStatus(roomId: string, userId: string, isEnabled: boolean) {
    if (!userId) throw new Error("Yetkilendirme hatası.");
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);
    try {
        await updateDoc(userVoiceRef, {
            isSharingVideo: isEnabled
        });
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

    