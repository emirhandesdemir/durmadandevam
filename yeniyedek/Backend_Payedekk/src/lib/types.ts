// src/lib/types.ts
import { Timestamp } from "firebase/firestore";

export interface MatchmakingChat {
    id: string;
    participants: { [uid: string]: { username: string, photoURL: string | null } };
    participantUids: string[];
    status: 'active' | 'revealing' | 'ended' | 'abandoned';
    createdAt: Timestamp;
    reactions?: { [uid: string]: 'like' | 'pass' };
}

export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    photoURL?: string | null;
    bio?: string;
    role: 'admin' | 'user';
    gender?: 'male' | 'female';
    createdAt: Timestamp;
    followers: string[];
    following: string[];
    diamonds: number;
    matchmakingRights?: number; // Eşleşme hakkı
    lastMatchDate?: Timestamp; // Son eşleşme tarihi
    referredBy?: string | null;
    hasUnreadNotifications?: boolean;
    fcmTokens?: string[];
    blockedUsers?: string[];
    isBanned?: boolean;
    reportCount?: number;
    referralCount?: number;
    isOnline?: boolean;
    lastSeen?: Timestamp;
    activeMatchmakingChatId?: string | null; // Aktif eşleşme sohbet ID'si
}

export interface DirectMessage {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    imageUrl?: string;
    createdAt: Timestamp;
    read: boolean;
    edited: boolean;
    editedAt?: Timestamp;
    deleted?: boolean;
    reactions?: {
        [emoji: string]: string[]; // key: emoji, value: array of user UIDs
    }
}
//... (existing types)
export interface ColorTheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeSettings {
    light: ColorTheme;
    dark: ColorTheme;
    radius: string; // e.g. "0.5rem"
    font: string; // e.g. "var(--font-jakarta)"
    appName?: string;
    appLogoUrl?: string;
    defaultMode?: 'light' | 'dark' | 'system';
}

export interface FollowRequest {
    uid: string;
    username:string;
    photoURL: string | null;
    requestedAt: Timestamp;
}

export interface Notification {
    id: string;
    recipientId: string;
    senderId: string;
    senderUsername: string;
    senderAvatar: string | null;
    type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'mention' | 'diamond_transfer' | 'retweet' | 'referral_bonus' | 'call_incoming' | 'call_missed';
    postId?: string | null;
    postImage?: string | null;
    commentText?: string;
    roomId?: string;
    roomName?: string;
    diamondAmount?: number;
    createdAt: Timestamp;
    read: boolean;
    callId?: string;
    callType?: 'video' | 'audio';
}

export interface Post {
    id: string;
    uid: string;
    username: string;
    userAvatar?: string | null;
    userRole?: 'admin' | 'user';
    userGender?: 'male' | 'female';
    text: string;
    imageUrl?: string;
    editedWithAI?: boolean;
    createdAt: Timestamp | { seconds: number; nanoseconds: number };
    likes: string[]; // Beğenen kullanıcıların UID'lerini tutan dizi
    likeCount: number;
    commentCount: number;
    language?: string;
    commentsDisabled?: boolean;
    likesHidden?: boolean;
    retweetOf?: {
        postId: string;
        uid: string;
        username: string;
        userAvatar?: string | null;
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
    userRole?: 'admin' | 'user';
    text: string;
    createdAt: Timestamp;
    replyTo?: {
        commentId: string;
        username: string;
    } | null;
}

export interface Like {
    id: string;
    userId: string;
    postId: string;
    createdAt: Timestamp;
}


export interface Room {
    id: string;
    name: string;
    description: string;
    createdBy: {
        uid: string;
        username: string;
        photoURL?: string | null;
    };
    moderators: string[]; // List of moderator UIDs
    createdAt: Timestamp;
    expiresAt?: Timestamp;
    participants: { uid: string, username: string, photoURL?: string | null }[];
    maxParticipants: number;
    nextGameTimestamp?: Timestamp;
    voiceParticipantsCount?: number;
    rules: string | null;
    welcomeMessage: string | null;
    pinnedMessageId: string | null;
    language?: string;
    type?: 'public' | 'private' | 'event';
    djUid?: string | null;
    isMusicPlaying?: boolean;
    currentTrackIndex?: number;
}


export interface VoiceParticipant {
    uid: string;
    username: string;
    photoURL?: string | null;
    role?: 'admin' | 'user';
    isSpeaker: boolean;
    isMuted: boolean;
    canSpeak: boolean; // Permission to speak in request-to-speak mode
    isSharingScreen: boolean;
    isSharingVideo: boolean;
    joinedAt: Timestamp;
    lastActiveAt?: Timestamp;
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
    finishedAt?: Timestamp;
}

export interface GameQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  addedBy: string; // UID of admin who added it
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


export interface FeatureFlags {
    quizGameEnabled: boolean;
    postFeedEnabled: boolean;
    contentModerationEnabled: boolean;
    botNewUserOnboardEnabled: boolean;
    botAutoPostEnabled: boolean;
    botAutoInteractEnabled: boolean;
    botAutoRoomInteractEnabled: boolean;
}

export interface VoiceStats {
    totalUsers: number;
}


export interface DirectMessageMetadata {
    id: string; // chatId
    participantUids: string[];
    participantInfo: {
        [uid: string]: {
            username: string;
            photoURL: string | null;
        }
    };
    lastMessage: {
        text: string;
        senderId: string;
        timestamp: Timestamp;
        read: boolean;
    } | null;
    unreadCounts: {
        [uid: string]: number;
    };
    pinnedBy?: string[];
    hiddenBy?: string[];
}

export interface Message {
  id: string;
  uid: string;
  username: string;
  photoURL?: string | null;
  text?: string;
  imageUrl?: string; // Changed from imageUrls
  videoUrl?: string;
  type?: 'system' | 'game' | 'portal' | 'user' | 'gameInvite';
  createdAt: Timestamp;
  selectedBubble?: string;
  selectedAvatarFrame?: string;
  portalRoomId?: string;
  portalRoomName?: string;
  gameInviteData?: GameInviteMessageData;
}

export interface Call {
  id: string;
  callerId: string;
  callerInfo: {
    username: string;
    photoURL: string | null;
  };
  receiverId: string;
  receiverInfo: {
    username: string;
    photoURL: string | null;
  };
  participantUids: string[];
  status: 'ringing' | 'active' | 'declined' | 'ended' | 'missed';
  type: 'video' | 'audio';
  videoStatus?: { [uid: string]: boolean };
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  duration?: string;
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
    winnerId?: string | null;
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

export interface BotActivityLog {
    id: string;
    botUserId: string;
    botUsername: string;
    actionType: 'post_text' | 'post_image' | 'post_video' | 'like' | 'comment' | 'follow' | 'dm_sent';
    targetUserId?: string;
    targetUsername?: string;
    targetPostId?: string;
    details: string;
    timestamp: Timestamp;
}
