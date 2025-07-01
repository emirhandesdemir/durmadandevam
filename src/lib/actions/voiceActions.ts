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
export async function joinVoiceChat(roomId: string, user: UserInfo, options?: { initialMuteState?: boolean }) {
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
            if (!userDbDoc.exists()) throw new Error("Kullanıcı profili bulunamadı.");

            const roomData = roomDoc.data() as Room;
            const isExpired = roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date();
            if(isExpired) throw new Error("Bu odanın süresi dolmuş.");
            
            const isAlreadyInVoice = userVoiceDoc.exists();
            if (isAlreadyInVoice) return;

            const userData = userDbDoc.data();
            const voiceCount = roomData.voiceParticipantsCount || 0;
            if (voiceCount >= roomData.maxParticipants) throw new Error("Sesli sohbet dolu.");

            const participantData: Omit<VoiceParticipant, 'isSpeaker'> = {
                uid: user.uid,
                username: user.displayName || 'Anonim',
                photoURL: user.photoURL,
                isMuted: options?.initialMuteState ?? false,
                isSharingScreen: false,
                isSharingVideo: false,
                canSpeak: false,
                joinedAt: serverTimestamp() as Timestamp,
                lastActiveAt: serverTimestamp() as Timestamp,
                selectedBubble: userData.selectedBubble || '',
                selectedAvatarFrame: userData.selectedAvatarFrame || '',
            };
            
            transaction.set(userVoiceRef, participantData);

            const isAlreadyParticipant = roomData.participants?.some(p => p.uid === user.uid);
            const roomUpdates: { [key: string]: any } = { voiceParticipantsCount: increment(1) };
            const newParticipantData = {
                uid: user.uid,
                username: user.displayName || 'Anonim',
                photoURL: user.photoURL || null
            };

            if (!isAlreadyParticipant) {
                roomUpdates.participants = arrayUnion(newParticipantData);
                const messagesRef = collection(db, 'rooms', roomId, 'messages');
                const joinMessage = {
                    type: 'system',
                    text: `👋 ${newParticipantData.username} odaya katıldı.`,
                    createdAt: serverTimestamp(),
                    uid: 'system',
                    username: 'System',
                };
                transaction.set(doc(messagesRef), joinMessage);
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
            const roomDoc = await transaction.get(roomRef);
            const userVoiceDoc = await transaction.get(userVoiceRef);

            if (!roomDoc.exists()) return; // Oda silinmiş olabilir, sessizce çık.
            const roomData = roomDoc.data() as Room;

            // Eğer sesli sohbetteyse, çıkar.
            if (userVoiceDoc.exists()) {
                transaction.delete(userVoiceRef);
                transaction.update(roomRef, { voiceParticipantsCount: increment(-1) });
                transaction.set(voiceStatsRef, { totalUsers: increment(-1) }, { merge: true });
            }

            // Ayrıca ana katılımcı listesinden çıkar ve sistem mesajı gönder.
            const participantToRemove = roomData.participants?.find(p => p.uid === userId);
            if (participantToRemove) {
                transaction.update(roomRef, {
                    participants: arrayRemove(participantToRemove)
                });
                
                const messagesRef = collection(db, 'rooms', roomId, 'messages');
                const leaveMessage = {
                    type: 'system',
                    text: `🏃 ${participantToRemove.username || 'Bir kullanıcı'} odadan ayrıldı.`,
                    createdAt: serverTimestamp(),
                    uid: 'system',
                    username: 'System',
                };
                transaction.set(doc(messagesRef), leaveMessage);
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
 * Kullanıcının video durumunu günceller.
 */
export async function toggleVideo(roomId: string, userId: string, isSharing: boolean) {
    if (!userId) throw new Error("Yetkilendirme hatası.");
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);
    try {
        await updateDoc(userVoiceRef, { 
            isSharingVideo: isSharing,
            lastActiveAt: serverTimestamp()
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
