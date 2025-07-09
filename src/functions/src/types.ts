// This file is a subset of the main types.ts and is used to provide type safety within Cloud Functions.
// It should be kept in sync with the relevant parts of the main types.ts file.

export interface GameSettings {
    dailyDiamondLimit: number;
    afkTimeoutMinutes: number;
    imageUploadQuality: number;
    audioBitrate: number;
    videoBitrate: number;
}

export interface FeatureFlags {
    postFeedEnabled: boolean;
    contentModerationEnabled: boolean;
}
