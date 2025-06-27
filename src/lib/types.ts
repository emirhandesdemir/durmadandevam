// src/lib/types.ts
import { Timestamp } from "firebase/firestore";

export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    photoURL?: string | null;
    role: 'admin' | 'user';
    createdAt: Timestamp;
    privateProfile: boolean;
    acceptsFollowRequests: boolean;
    followers: string[];
    following: string[];
    followRequests: FollowRequest[];
    diamonds: number;
    selectedBubble?: string;
    selectedAvatarFrame?: string;
    hasUnreadNotifications?: boolean;
}

export interface ProfileViewer {
    uid: string;
    viewedAt: Timestamp;
    username?: string;
    photoURL?: string | null;
}

export interface FollowRequest {
    uid: string;
    username: string;
    photoURL: string | null;
    requestedAt: Timestamp;
}

export interface Notification {
    id: string;
    recipientId: string;
    senderId: string;
    senderUsername: string;
    senderAvatar: string | null;
    type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite';
    postId?: string | null;
    postImage?: string | null;
    commentText?: string;
    roomId?: string;
    roomName?: string;
    createdAt: Timestamp;
    read: boolean;
}

export interface Post {
    id: string;
    uid: string;
    username: string;
    userAvatar?: string;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
    text: string;
    imageUrl?: string;
    createdAt: Timestamp | { seconds: number; nanoseconds: number };
    likes: string[];
    likeCount: number;
    commentCount: number;
}

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
    expiresAt?: Timestamp;
    participants: { uid: string, username: string, photoURL?: string | null }[];
    maxParticipants: number;
    nextGameTimestamp?: Timestamp;
    voiceParticipantsCount?: number;
}

export interface VoiceParticipant {
    uid: string;
    username: string;
    photoURL?: string | null;
    isSpeaker: boolean;
    isMuted: boolean;
    isSharingScreen: boolean;
    joinedAt: Timestamp;
    lastActiveAt?: Timestamp;
    selectedBubble?: string;
    selectedAvatarFrame?: string;
}

export interface GameQuestion {
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    createdAt: Timestamp;
}

export interface GameSettings {
    dailyDiamondLimit: number;
    gameIntervalMinutes: number;
    questionTimerSeconds: number;
    rewardAmount: number;
    cooldownSeconds: number;
    afkTimeoutMinutes: number;
}

export interface ActiveGame {
    id: string;
    questionId: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    startTime: Timestamp;
    status: 'active' | 'finished';
    answeredBy: string[];
    winner?: string;
}

export interface FeatureFlags {
    quizGameEnabled: boolean;
    postFeedEnabled: boolean;
}

export interface VoiceStats {
    totalUsers: number;
}
