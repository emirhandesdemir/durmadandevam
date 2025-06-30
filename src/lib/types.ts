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
    gender?: 'male' | 'female';
    createdAt: Timestamp;
    privateProfile: boolean;
    acceptsFollowRequests: boolean;
    showOnlineStatus?: boolean;
    followers: string[];
    following: string[];
    followRequests: FollowRequest[];
    diamonds: number;
    referredBy?: string | null;
    referralCount?: number;
    selectedBubble?: string;
    selectedAvatarFrame?: string;
    hasUnreadNotifications?: boolean;
    fcmTokens?: string[];
    blockedUsers?: string[];
    isBanned?: boolean;
    reportCount?: number;
}

export interface ProfileViewer {
    uid: string;
    viewedAt: Timestamp;
    username?: string;
    photoURL?: string | null;
    selectedAvatarFrame?: string;
}

export interface Report {
    id: string;
    reporterId: string;
    reporterUsername: string;
    reportedUserId: string;
    reportedUsername: string;
    reason: string;
    details: string;
    timestamp: Timestamp;
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
    type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'mention' | 'diamond_transfer' | 'retweet';
    postId?: string | null;
    postImage?: string | null;
    commentText?: string;
    roomId?: string;
    roomName?: string;
    diamondAmount?: number;
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
    userGender?: 'male' | 'female';
    text: string;
    imageUrl?: string;
    imagePublicId?: string;
    editedWithAI?: boolean;
    createdAt: Timestamp | { seconds: number; nanoseconds: number };
    likes: string[]; // Beğenen kullanıcıların UID'lerini tutan dizi
    likeCount: number;
    commentCount: number;
    retweetOf?: {
        postId: string;
        uid: string;
        username: string;
        userAvatar?: string | null;
        userAvatarFrame?: string;
        text: string;
        imageUrl?: string;
        createdAt: Timestamp | { seconds: number; nanoseconds: number };
    }
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
    speakRequests?: string[]; // Array of UIDs who requested to speak
    rules: string | null;
    welcomeMessage: string | null;
    pinnedMessageId: string | null;
}

export interface VoiceParticipant {
    uid: string;
    username: string;
    photoURL?: string | null;
    isSpeaker: boolean;
    isMuted: boolean;
    canSpeak: boolean; // Permission to speak in request-to-speak mode
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
    imageUploadQuality: number;
    audioBitrate: number;
    videoBitrate: number;
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

export interface DirectMessage {
    id: string;
    senderId: string;
    receiverId: string;
    text?: string;
    imageUrl?: string;
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


// Admin Analytics Types
export interface UserGrowthDataPoint {
    month: string;
    users: number;
}
export interface ContentDataPoint {
    name: string;
    posts: number;
    comments: number;
}
export interface RoomActivityDataPoint {
    hour: string;
    rooms: number;
}

export interface AuditLog {
    id: string;
    type: 'user_created' | 'user_deleted';
    timestamp: Timestamp;
    actor: {
        uid: string;
        email?: string;
        displayName?: string;
    };
    details: string;
}

export interface ActiveGameSession {
    id: string;
    gameType: 'dice' | 'rps' | 'bottle';
    gameName: string;
    hostId: string;
    players: { uid: string, username: string, photoURL: string | null }[];
    moves: { [key: string]: string | number };
    status: 'pending' | 'active' | 'finished';
    turn?: string; // For turn-based games
    winnerId?: string;
    createdAt: Timestamp;
}

export interface GameInviteMessageData {
    host: { uid: string, username: string, photoURL: string | null };
    gameName: string;
    gameType: string;
    invitedPlayers: { uid: string, username: string, photoURL: string | null }[];
    acceptedPlayers: { uid: string, username: string, photoURL: string | null }[];
    declinedPlayers: { uid: string, username: string, photoURL: string | null }[];
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
}

// Augment the existing Message interface
export interface Message {
  // ... existing fields
  gameInviteData?: GameInviteMessageData;
}
