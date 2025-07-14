// src/lib/types.ts
import { Timestamp } from "firebase/firestore";

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

// Oyuncunun bireysel durumunu ve rolünü tanımlar.
export interface MindWarPlayer {
  uid: string; // Oyuncunun kimliği
  username: string; // Oyuncu adı
  photoURL: string | null; // Profil resmi
  role: string; // Oyuna özel rolü (Hacker, Lider, Casus vb.)
  status: 'alive' | 'eliminated'; // Oyundaki durumu
  objective: string; // Oyuncunun kişisel görevi
  inventory: string[]; // Sahip olduğu eşyalar
}

// Oyunun her bir turunu veya olayını kaydeder.
export interface MindWarTurn {
  turnNumber: number; // Tur numarası
  activePlayerUid: string | null; // Sırası gelen oyuncu (null ise anlatıcı konuşur)
  narrative: string; // Yapay zeka anlatıcısının o turdaki hikaye metni
  choices: { [key: string]: string }; // Oyuncuya sunulan seçenekler (örn: { 'A': 'Kapıyı aç', 'B': 'Pencereyi kontrol et' })
  playerChoice?: { // Oyuncunun yaptığı seçim
    uid: string;
    choiceKey: string; // 'A' veya 'B' gibi
    choiceText: string;
  };
  outcome?: string; // Seçim sonucunda ne olduğu
  timestamp: Timestamp; // Turun zamanı
}

// Oyun oturumunun tamamını kapsayan ana veri yapısı.
export interface MindWarSession {
  id: string; // Oturum ID'si
  status: 'lobby' | 'ongoing' | 'finished'; // Oyunun mevcut durumu
  hostId: string; // Oyunu başlatan kişi
  theme: string; // Oyunun ana teması (örn: "Kıyamet sonrası sığınak")
  players: MindWarPlayer[]; // Oyuncuların listesi
  spectators: { uid: string, username: string }[]; // İzleyiciler
  gameHistory: MindWarTurn[]; // Geçmiş tüm turların kaydı
  currentTurn: MindWarTurn; // Mevcut aktif tur
  endSummary?: { // Oyun sonu özeti
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
  createdAt: Timestamp; // Başlangıç zamanı
}


export interface LiveSession {
    id: string;
    hostId: string;
    hostUsername: string;
    hostPhotoURL: string | null;
    title: string;
    status: 'live' | 'ended';
    viewerCount: number;
    createdAt: Timestamp;
    endedAt?: Timestamp;
}


// Mevcut Tiplere Eklemeler
// ==========================

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

export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    photoURL: string | null;
    bio?: string;
    postCount?: number;
    role: 'admin' | 'user';
    gender?: 'male' | 'female';
    age?: number;
    city?: string;
    country?: string;
    interests?: string[];
    createdAt: Timestamp;
    lastActionTimestamp?: Timestamp; // For rate limiting
    lastAdWatchedAt?: Timestamp; // For ad reward cooldown
    privateProfile: boolean;
    acceptsFollowRequests: boolean;
    showOnlineStatus?: boolean;
    followers: string[];
    following: string[];
    followRequests: FollowRequest[];
    diamonds: number;
    referredBy?: string | null;
    referralCount?: number;
    hasUnreadNotifications?: boolean;
    fcmTokens?: string[];
    blockedUsers?: string[];
    hiddenPostIds?: string[];
    savedPosts?: string[];
    isBanned?: boolean;
    reportCount?: number;
    isOnline?: boolean;
    lastSeen?: Timestamp;
    premiumUntil?: Timestamp;
    isFirstPremium?: boolean;
    unlimitedRoomCreationUntil?: Timestamp;
    profileCompletionNotificationSent?: boolean;
    selectedBubble?: string;
    selectedAvatarFrame?: string;
    activeMatchmakingChatId?: string | null; // Aktif eşleşme sohbet ID'si
}

export interface ProfileViewer {
    uid: string;
    viewedAt: Timestamp;
    username?: string;
    photoURL: string | null;
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
    targetId: string; // Can be userId or postId
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
    photoURL: string | null;
    senderAvatarFrame?: string;
    type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'mention' | 'diamond_transfer' | 'retweet' | 'referral_bonus' | 'call_incoming' | 'call_missed' | 'dm_message' | 'complete_profile';
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
}

export interface Post {
    id: string;
    uid: string;
    username: string;
    photoURL: string | null;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
    userGender?: 'male' | 'female';
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    backgroundStyle?: string;
    editedWithAI?: boolean;
    createdAt: Timestamp | { seconds: number; nanoseconds: number };
    likes: string[]; // Array of user UIDs who liked the post
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
        photoURL: string | null;
        userAvatarFrame?: string;
        text: string;
        imageUrl?: string;
        videoUrl?: string;
        createdAt: Timestamp | { seconds: number; nanoseconds: number };
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
    createdAt: Timestamp;
    replyTo?: {
        commentId: string;
        username: string;
    } | null;
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
        selectedAvatarFrame?: string;
    };
    moderators: string[]; // List of moderator UIDs
    createdAt: Timestamp;
    expiresAt?: Timestamp | null;
    portalExpiresAt?: Timestamp; // For public announcements
    participants: { uid: string, username: string, photoURL?: string | null }[];
    maxParticipants: number;
    voiceParticipantsCount?: number;
    rules: string | null;
    welcomeMessage: string | null;
    pinnedMessageId: string | null;
    language?: string;
    type?: 'public' | 'private' | 'event';
    // Music Player State
    djUid?: string | null;
    isMusicPlaying?: boolean;
    currentTrackIndex?: number;
    currentTrackName?: string;
    giveaway?: Giveaway;
    activeMindWarSessionId?: string | null; // Zihin Savaşları oturum ID'si
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
    role?: 'admin' | 'user';
    isSpeaker: boolean;
    isMuted: boolean;
    canSpeak: boolean; // Permission to speak in request-to-speak mode
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
    scores: { [key: string]: number }; // uid -> score
    answeredBy: string[]; // This has been changed to a simple array of UIDs
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
  type?: 'user' | 'call';
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
      [emoji: string]: string[]; // key: emoji, value: array of user UIDs
  };
  callData?: {
      status: 'started' | 'ended' | 'missed' | 'declined';
      duration?: string; // e.g., "5 dakika 32 saniye"
  };
}

export interface DirectMessageMetadata {
    id: string; // chatId
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
