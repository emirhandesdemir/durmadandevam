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
    setDoc,
    arrayUnion,
    getDocs
} from 'firebase/firestore';
import type { Room, VoiceParticipant, PlaylistTrack } from '../types';
import { addSystemMessage } from './roomActions';

interface UserInfo {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
}

const voiceStatsRef = doc(db, 'config', 'voiceStats');
const BOT_USER_INFO = {
    uid: 'ai-bot-walk',
    username: 'Walk',
    photoURL: `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="url(#bot-grad)"/><rect x="25" y="45" width="50" height="20" rx="10" fill="white" fill-opacity="0.8"/><circle cx="50" cy="40" r="15" fill="white"/><circle cx="50" cy="40" r="10" fill="url(#eye-grad)"/><path d="M35 70 Q 50 80, 65 70" stroke="white" stroke-width="4" stroke-linecap="round" fill="none"/><defs><linearGradient id="bot-grad" x1="0" y1="0" x2="100" y2="100"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#3b82f6"/></linearGradient><radialGradient id="eye-grad"><stop offset="20%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#2563eb"/></radialGradient></defs></svg>`)}`,
    role: 'user' as 'user' | 'admin',
    selectedAvatarFrame: 'avatar-frame-tech'
};

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
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");

            const userDbDoc = await transaction.get(userDbRef);
            if (!userDbDoc.exists()) throw new Error("Kullanıcı profili bulunamadı.");
            
            const userVoiceDoc = await transaction.get(userVoiceRef);

            const roomData = roomDoc.data() as Room;
            const isExpired = roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date() && roomData.type !== 'event';
            if(isExpired) throw new Error("Bu odanın süresi dolmuş.");
            
            const isAlreadyInVoice = userVoiceDoc.exists();
            if (isAlreadyInVoice) return;

            const userData = userDbDoc.data();
            const voiceCount = roomData.voiceParticipantsCount || 0;
            if (voiceCount >= roomData.maxParticipants) throw new Error("Sesli sohbet dolu.");
            
            const participantData: Omit<VoiceParticipant, 'isSpeaking'> = {
                uid: user.uid,
                username: userData.username || 'Anonim',
                photoURL: userData.photoURL || null,
                profileEmoji: userData.profileEmoji || null,
                role: userData.role || 'user',
                giftLevel: userData.giftLevel || 0,
                isMuted: options?.initialMuteState ?? false,
                isSharingScreen: false,
                isSharingVideo: false,
                canSpeak: true, // All users can speak by default now
                joinedAt: serverTimestamp() as Timestamp,
                lastActiveAt: serverTimestamp() as Timestamp,
                selectedBubble: userData.selectedBubble || '',
                selectedAvatarFrame: userData.selectedAvatarFrame || '',
            };
            
            // NEW: Also add to main participants list if not there
            const isMainParticipant = roomData.participants?.some((p: any) => p.uid === user.uid);
            if (!isMainParticipant) {
                transaction.update(roomRef, {
                    participants: arrayUnion({
                        uid: user.uid,
                        username: user.displayName || "Anonim",
                        photoURL: user.photoURL || null
                    })
                });

                let welcomeMessage = `👋 Hoş geldin, ${user.displayName}!`;
                // Check giftLevel for special welcome message
                if(userData.giftLevel && userData.giftLevel > 0) {
                    welcomeMessage = `🔥 Seviye ${userData.giftLevel} Hediye Lideri ${user.displayName} odaya katıldı! 🔥`;
                }

                const messagesRef = collection(db, "rooms", roomId, "messages");
                transaction.set(doc(messagesRef), {
                    type: 'system',
                    text: welcomeMessage,
                    createdAt: serverTimestamp()
                });
            }

            transaction.set(userVoiceRef, participantData);
            transaction.update(userDbRef, { activeRoomId: roomId, activeRoomName: roomData.name });
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
 * Bu fonksiyon sadece sesli sohbetle ilgili verileri temizler.
 */
export async function leaveVoice(roomId: string, userId: string) {
    if (!userId) throw new Error("Yetkilendirme hatası.");

    const roomRef = doc(db, 'rooms', roomId);
    const userVoiceRef = doc(db, 'rooms', roomId, 'voiceParticipants', userId);
    const userDbRef = doc(db, 'users', userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userVoiceDoc = await transaction.get(userVoiceRef);

            // Eğer sesli sohbetteyse, çıkar.
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

    
