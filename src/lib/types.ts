// src/lib/types.ts
import { Timestamp } from "firebase/firestore";

export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    photoURL?: string | null;
    bio?: string;
    postCount?: number;
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
    selectedAvatarFrame?: string;
}

export interface FollowRequest {
    uid: string;
    username:string;
    photoURL: string | null;
    userAvatarFrame?: string;
    requestedAt: Timestamp;
}

export interface Notification {
    id: string;
    recipientId: string;
    senderId: string;
    senderUsername: string;
    senderAvatar: string | null;
    senderAvatarFrame?: string;
    type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'portal_opened';
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
    userAvatar?: string | null;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
    text: string;
    imageUrl?: string;
    imagePublicId?: string;
    createdAt: Timestamp | { seconds: number; nanoseconds: number };
    likes: string[]; // Beğenen kullanıcıların UID'lerini tutan dizi
    likeCount: number;
    commentCount: number;
}

export interface Comment {
    id: string;
    uid: string;
    username: string;
    userAvatar?: string;
    userAvatarFrame?: string;
    text: string;
    createdAt: Timestamp;
    replyTo?: {
        commentId: string;
        username: string;
    } | null;
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
        selectedAvatarFrame?: string;
    };
    moderators: string[]; // List of moderator UIDs
    createdAt: Timestamp;
    expiresAt?: Timestamp; // Only for rooms
    portalExpiresAt?: Timestamp; // For boosted rooms
    participants: { uid: string, username: string, photoURL?: string | null }[];
    maxParticipants: number;
    nextGameTimestamp?: Timestamp;
    voiceParticipantsCount?: number;
    requestToSpeakEnabled?: boolean;
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
    handRaised?: boolean;
    canSpeak?: boolean;
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

// YENİ: Direkt Mesajlaşma Sistemi için Türler
export interface DirectMessage {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: Timestamp;
    read: boolean;
    edited: boolean;
    editedAt?: Timestamp;
}

export interface DirectMessageMetadata {
    id: string; // chatId
    participantUids: string[];
    participantInfo: {
        [uid: string]: {
            username: string;
            photoURL: string | null;
            selectedAvatarFrame?: string;
        }
    };
    lastMessage: {
        text: string;
        senderId: string;
        timestamp: Timestamp;
        read?: boolean;
    } | null;
    unreadCounts: {
        [uid: string]: number;
    };
}

export interface Message {
  id: string;
  uid: string;
  username: string;
  photoURL?: string | null;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  type?: 'system' | 'game' | 'portal' | 'user';
  createdAt: Timestamp;
  selectedBubble?: string;
  selectedAvatarFrame?: string;
  portalRoomId?: string;
  portalRoomName?: string;
}
