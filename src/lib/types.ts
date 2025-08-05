// src/lib/types.ts
import { Timestamp } from "firebase/firestore";

export interface Announcement {
    id: string;
    roomId: string;
    roomName: string;
    hostUsername: string;
    message: string;
    rewardAmount: number;
    createdAt: Timestamp;
    expiresAt: Timestamp;
}

export interface Transaction {
    id: string;
    type: 'diamond_purchase' | 'gift_sent' | 'gift_received' | 'profile_value_conversion' | 'room_creation' | 'room_perk' | 'admin_grant' | 'ad_reward' | 'referral_bonus' | 'live_gift' | 'user_perk' | 'event_reward' | 'email_verification';
    amount: number;
    description: string;
    relatedUserId?: string | null;
    roomId?: string | null;
    liveId?: string | null;
    giftId?: string | null;
    timestamp: Timestamp | { seconds: number; nanoseconds: number };
}

export interface MatchmakingChat {
    id: string;
    participants: { [uid: string]: { username: string, photoURL: string | null, age?: number } };
    participantUids: string[];
    status: 'active' | 'ended' | 'abandoned';
    createdAt: Timestamp;
    reactions?: { [uid: string]: 'like' | 'pass' };
    permanentChatId?: string;
}

// Zihin Savaşları Oyunu Veri Yapıları
// ===================================

export interface MindWarPlayer {
  uid: string;
  username: string;
  photoURL: string | null;
  role: string;
  status: 'alive' | 'eliminated';
  objective: string;
  inventory: string[];
}

export interface MindWarTurn {
  turnNumber: number;
  activePlayerUid: string | null;
  narrative: string;
  choices: { [key: string]: string };
  playerChoice?: {
    uid: string;
    choiceKey: string;
    choiceText: string;
  };
  outcome?: string;
  timestamp: Timestamp;
}

export interface MindWarSession {
  id: string;
  status: 'lobby' | 'ongoing' | 'finished';
  hostId: string;
  theme: string;
  players: MindWarPlayer[];
  spectators: { uid: string, username: string }[];
  gameHistory: MindWarTurn[];
  currentTurn: MindWarTurn;
  endSummary?: {
    narrative: string;
    winner: string | null;
    scores: {
      [uid: string]: {
        intelligence: number;
        trust: number;
        courage: number;
        reward: number;
      };
    };
  };
  createdAt: Timestamp;
}


export interface LiveSession {
    id: string;
    hostId: string;
    hostUsername: string;
    hostPhotoURL: string | null;
    title: string;
    status: 'live' | 'ended';
    viewerCount: number;
    viewers: string[]; // List of unique viewer UIDs
    peakViewerCount: number;
    createdAt: Timestamp;
    endedAt?: Timestamp;
    totalGiftValue?: number;
    durationSeconds?: number;
}

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
    radius: string;
    font: string;
    appName?: string;
    appLogoUrl?: string;
    defaultMode?: 'light' | 'dark' | 'system';
}

export interface AppSettings {
    dataSaver: boolean;
    disableAnimations: boolean;
}

export interface UserProfile {
    uid: string;
    uniqueTag: number;
    email: string;
    emailVerified: boolean;
    emailVerificationAwarded?: boolean;
    username: string;
    username_lowercase?: string;
    photoURL: string | null;
    profileEmoji?: string | null;
    bio: string | null;
    phoneNumber?: string | null;
    postCount: number;
    role: 'admin' | 'user';
    gender?: 'male' | 'female';
    age: number | null;
    city: string | null;
    country: string | null;
    interests: string[];
    createdAt: Timestamp;
    lastActionTimestamp?: Timestamp;
    lastAdWatchedAt?: Timestamp;
    privateProfile: boolean;
    acceptsFollowRequests: boolean;
    showOnlineStatus: boolean;
    showActiveRoom?: boolean;
    animatedNav?: boolean;
    followers: string[];
    following: string[];
    followRequests: FollowRequest[];
    diamonds: number;
    profileValue: number; // For receiving gifts
    giftLevel: number; // The user's gift-giving level
    totalDiamondsSent: number; // Total diamonds spent on gifts
    referredBy: string | null;
    referralCount: number;
    hasUnreadNotifications: boolean;
    fcmTokens?: string[];
    blockedUsers: string[];
    hiddenPostIds: string[];
    savedPosts: string[];
    isBanned: boolean;
    reportCount: number;
    isOnline: boolean;
    lastSeen?: Timestamp;
    premiumUntil: Timestamp | null;
    isFirstPremium: boolean;
    unlimitedRoomCreationUntil: Timestamp | null;
    profileCompletionNotificationSent: boolean;
    profileCompletionAwarded?: boolean;
    selectedBubble: string;
    selectedAvatarFrame: string;
    activeMatchmakingChatId: string | null;
    activeRoomId?: string | null;
    activeRoomName?: string | null;
    location?: {
        latitude: number;
        longitude: number;
    };
    sessions: {
        [key: string]: {
            lastSeen: Timestamp;
            ipAddress?: string;
            userAgent?: string;
        }
    };
    feedSettings?: FeedSettings;
    appSettings?: AppSettings;
    dataSaved?: number; // in bytes
    claimedEventRewards?: string[];
}

export interface ProfileViewer {
    uid: string;
    viewedAt: Timestamp;
    username?: string;
    photoURL: string | null;
    profileEmoji?: string | null;
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
    targetId: string;
    targetType: 'user' | 'post';
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
    senderUniqueTag?: number;
    photoURL: string | null;
    profileEmoji?: string | null;
    senderAvatarFrame?: string;
    type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'mention' | 'diamond_transfer' | 'retweet' | 'referral_bonus' | 'call_incoming' | 'call_missed' | 'dm_message' | 'complete_profile' | 'system' | 'event_reward';
    postId?: string | null;
    postImage?: string | null;
    commentText?: string;
    messageText?: string;
    chatId?: string;
    roomId?: string;
    roomName?: string;
    diamondAmount?: number;
    createdAt: Timestamp;
    read: boolean;
    callId?: string;
    callType?: 'video' | 'audio';
    link?: string;
}

export interface Post {
    id: string;
    uid: string;
    username: string;
    userUniqueTag?: number;
    userPhotoURL: string | null;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
    userGender?: 'male' | 'female';
    emailVerified?: boolean;
    text: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    videoThumbnailUrl?: string | null;
    backgroundStyle?: string;
    createdAt: Timestamp | { seconds: number; nanoseconds: number } | string;
    likes: string[];
    likeCount: number;
    commentCount: number;
    saveCount?: number;
    savedBy?: string[];
    language?: string;
    commentsDisabled?: boolean;
    likesHidden?: boolean;
    retweetOf?: {
        postId: string;
        uid: string;
        username: string;
        userPhotoURL: string | null;
        userAvatarFrame?: string;
        text: string;
        imageUrl?: string;
        videoUrl?: string;
        createdAt: Timestamp | { seconds: number; nanoseconds: number } | string;
    }
}


export interface Comment {
    id: string;
    uid: string;
    username: string;
    photoURL: string | null;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
    text: string;
    createdAt: Timestamp | { seconds: number; nanoseconds: number } | string;
    replyTo?: {
        commentId: string;
        username: string;
    } | null;
    giftId?: string | null;
}

export interface Giveaway {
    status: 'idle' | 'active' | 'finished';
    prize: string;
    participants: { uid: string, username: string, photoURL: string | null }[];
    winner?: { uid: string, username: string, photoURL: string | null };
    startedAt?: Timestamp;
    endedAt?: Timestamp;
}

export interface Room {
    id: string;
    name: string;
    description: string;
    createdBy: {
        uid: string;
        username: string;
        photoURL: string | null;
        role: string;
        isPremium?: boolean;
        selectedAvatarFrame?: string;
    };
    moderators: string[];
    createdAt: Timestamp;
    expiresAt?: Timestamp | null;
    portalExpiresAt?: Timestamp;
    participants: { uid: string, username: string, photoURL?: string | null }[];
    maxParticipants: number;
    voiceParticipantsCount?: number;
    rules: string | null;
    welcomeMessage: string | null;
    pinnedMessageId: string | null;
    language?: string;
    type?: 'public' | 'private' | 'event';
    djUid?: string | null;
    isMusicPlaying?: boolean;
    currentTrackIndex?: number;
    currentTrackName?: string;
    giveaway?: Giveaway;
    activeMindWarSessionId?: string | null;
    totalGiftValue?: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    lastXpGainTimestamp: Timestamp | null;
    autoQuizEnabled?: boolean;
    nextGameTimestamp?: Timestamp;
}

export interface PlaylistTrack {
    id: string;
    name: string;
    fileUrl: string;
    storagePath: string;
    addedByUid: string;
    addedByUsername: string;
    order: number;
    createdAt: Timestamp;
}

export interface VoiceParticipant {
    uid: string;
    username: string;
    photoURL?: string | null;
    profileEmoji?: string | null;
    role?: 'admin' | 'user';
    giftLevel: number;
    isSpeaker: boolean;
    isMuted: boolean;
    canSpeak: boolean;
    isSharingScreen: boolean;
    isSharingVideo: boolean;
    joinedAt: Timestamp;
    lastActiveAt?: Timestamp;
    selectedBubble?: string;
    selectedAvatarFrame?: string;
}

export interface ActiveGame {
    id: string;
    questions: QuizQuestion[];
    currentQuestionIndex: number;
    scores: { [key: string]: number };
    answeredBy: string[];
    status: 'countdown' | 'active' | 'finished';
    countdownStartTime?: Timestamp;
    startTime?: Timestamp;
    finishedAt?: Timestamp;
    winners?: { uid: string, username: string, photoURL: string | null, score: number, reward: number }[];
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctOptionIndex: number;
}

export interface GameSettings {
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
    contentModerationEnabled: boolean;
}

export interface VoiceStats {
    totalUsers: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  type?: 'user' | 'call' | 'shared_post';
  text?: string;
  imageUrl?: string;
  imageType?: 'permanent' | 'timed';
  imageOpened?: boolean;
  audioUrl?: string;
  audioDuration?: number;
  createdAt: Timestamp;
  read: boolean;
  edited: boolean;
  editedAt?: Timestamp;
  deleted?: boolean;
  reactions?: {
      [emoji: string]: string[];
  };
  callData?: {
      status: 'started' | 'ended' | 'missed' | 'declined';
      duration?: string;
  };
   sharedPostData?: {
      postId: string;
      postText?: string;
      postImageUrl?: string;
      postOwnerUsername: string;
  };
}

export interface DirectMessageMetadata {
    id: string;
    participantUids: string[];
    participantInfo: {
        [uid: string]: {
            username: string;
            photoURL: string | null;
            selectedAvatarFrame?: string;
            premiumUntil?: Timestamp;
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
  imageUrl?: string;
  videoUrl?: string;
  type?: 'system' | 'game' | 'portal' | 'user' | 'gameInvite' | 'gift' | 'announcement' | 'shared_post';
  createdAt: Timestamp;
  selectedBubble?: string;
  selectedAvatarFrame?: string;
  portalRoomId?: string;
  portalRoomName?: string;
  gameInviteData?: GameInviteMessageData;
  giftData?: {
      senderName: string;
      senderLevel?: number;
      receiverName?: string | null;
      giftId: string;
  };
  sharedPostData?: {
      postId: string;
      postText?: string;
      postImageUrl?: string;
      postOwnerUsername: string;
  };
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
    timestamp: Timestamp | string;
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
    turn?: string;
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

export interface FeedSettings {
  showOnlyFollowing: boolean;
  hideLikedPosts: boolean;
  hideVideos: boolean;
}
