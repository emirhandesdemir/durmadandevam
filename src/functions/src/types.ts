// This file is a subset of the main types.ts and is used to provide type safety within Cloud Functions.
// It should be kept in sync with the relevant parts of the main types.ts file.
import { Timestamp } from "firebase-admin/firestore";

export interface GameSettings {
    dailyDiamondLimit: number;
    gameIntervalMinutes: number;
    questionTimerSeconds: number;
    rewardAmount: number;
    cooldownSeconds: number;
    afkTimeoutMinutes: number;
    imageUploadQuality: number;
    audioBitrate: number;
    videoBitrate: number;
    botPostIntervalMinutes: number;
    botInteractIntervalMinutes: number;
    botRoomJoinIntervalMinutes: number;
    maxBotsPerRoom: number;
}

export interface FeatureFlags {
    quizGameEnabled: boolean;
    postFeedEnabled: boolean;
    contentModerationEnabled: boolean;
    botNewUserOnboardEnabled: boolean;
    botAutoPostEnabled: boolean;
    botAutoInteractEnabled: boolean;
    botAutoRoomInteractEnabled: boolean;
}

export interface BotState {
    lastPostRun?: Timestamp;
    lastInteractRun?: Timestamp;
    lastRoomInteractRun?: Timestamp;
}
