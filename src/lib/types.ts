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
