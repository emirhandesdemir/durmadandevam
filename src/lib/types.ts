// src/lib/types.ts
// Uygulama genelinde kullanılacak TypeScript türlerini tanımlar.

import { Timestamp } from "firebase/firestore";

/**
 * Quiz oyunu için bir sorunun yapısını tanımlar.
 * Firestore'daki `game_questions` koleksiyonundaki dokümanlara karşılık gelir.
 */
export interface GameQuestion {
    id: string;
    question: string;
    options: string[]; // 4 seçenek içeren bir dizi
    correctOptionIndex: number; // Doğru seçeneğin indeksi (0-3)
    createdAt: Timestamp;
}

/**
 * Oyun sisteminin genel ayarlarını tanımlar.
 * Firestore'daki `config/gameSettings` dokümanına karşılık gelir.
 */
export interface GameSettings {
    dailyDiamondLimit: number;
    gameIntervalMinutes: number;
    questionTimerSeconds: number;
    rewardAmount: number;
    cooldownSeconds: number;
}

/**
 * Bir odada o an aktif olan oyunun durumunu tanımlar.
 * Firestore'daki `rooms/{roomId}/games/{gameId}` dokümanına karşılık gelir.
 */
export interface ActiveGame {
    id: string;
    questionId: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    startTime: Timestamp;
    status: 'active' | 'finished';
    answeredBy: string[]; // Cevap veren kullanıcıların UID'leri
    winner?: string; // Kazananın UID'si
}

/**
 * Bir sohbet odasının yapısını tanımlar.
 * Firestore'daki `rooms` koleksiyonundaki dokümanlara karşılık gelir.
 */
export interface Room {
    id: string;
    name: string;
    description: string;
    createdBy: {
        uid: string;
        username: string;
        photoURL?: string | null;
        role?: 'admin' | 'user';
    };
    createdAt: Timestamp;
    participants: { uid: string, username: string, photoURL?: string | null }[];
    maxParticipants: number;
    nextGameTimestamp?: Timestamp;
    voiceParticipantsCount?: number; // Sesli sohbetteki kişi sayısı
}

/**
 * Sesli sohbetteki bir katılımcının yapısını tanımlar.
 * Firestore'daki `rooms/{roomId}/voiceParticipants/{userId}` dokümanına karşılık gelir.
 */
export interface VoiceParticipant {
    uid: string;
    username: string;
    photoURL?: string | null;
    isSpeaker: boolean;
    isMuted: boolean;
    joinedAt: Timestamp;
    lastSpokeAt?: Timestamp; // Son konuşma zamanı (inaktivite takibi için)
}
