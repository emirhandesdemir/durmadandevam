// This file is a subset of the main types.ts and is used to provide type safety within Cloud Functions.
// It should be kept in sync with the relevant parts of the main types.ts file.
import { Timestamp } from "firebase-admin/firestore";

export interface GameSettings {
    botAutomationEnabled: boolean;
    botPostIntervalMinutes: number;
    botInteractIntervalMinutes: number;
    // Add other settings if needed by functions
    dailyDiamondLimit: number;
    gameIntervalMinutes: number;
    questionTimerSeconds: number;
    rewardAmount: number;
    cooldownSeconds: number;
    afkTimeoutMinutes: number;
    imageUploadQuality: number;
    audioBitrate: number;
    videoBitrate: number;
}

export interface BotState {
    lastPostRun?: Timestamp;
    lastInteractRun?: Timestamp;
}
