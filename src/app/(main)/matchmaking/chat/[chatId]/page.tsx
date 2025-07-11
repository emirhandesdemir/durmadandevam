// src/app/(main)/matchmaking/chat/[chatId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MatchmakingChat, UserProfile } from '@/lib/types';
import { Loader2, Swords, Heart, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TextChat from '@/components/chat/text-chat';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { submitMatchReaction, endMatch } from '@/lib/actions/matchmakingActions';
import { useToast } from '@/hooks/use-toast';
import { getChatId } from '@/lib/utils';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { AnimatePresence, motion } from "framer-motion";

// 5 dakikalık geri sayım süresi
const MATCH_DURATION_SECONDS = 300; 

// Zamanlayıcıyı ve başlığı gösteren bileşen
function MatchmakingChatHeader({ chat, timeLeft }: { chat: MatchmakingChat; timeLeft: number }) {
  const progress = (timeLeft / MATCH_DURATION_SECONDS) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <header className="p-3 border-b shrink-0 bg-background/80 backdrop-blur-sm">
      <div className="text-center">
        <p className="font-bold text-xl">{`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}</p>
        <Progress value={progress} className="w-3/4 mx-auto mt-1 h-2" />
      </div>
    </header>
  );
}

// Sonuç ekranı bileşenleri
function MatchSuccessCard({ partner }: { partner: UserProfile & { permChatId: string } }) {
    const router = useRouter();
    return (
        <Card className="w-full max-w-sm text-center bg-green-500/10 border-green-500/30">
            <CardHeader><CardTitle className="text-green-600">Eşleştiniz!</CardTitle><CardDescription>Artık {partner.username} ile kalıcı olarak sohbet edebilir ve birbirinizi takip edebilirsiniz.</CardDescription></CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                 <Avatar className="h-24 w-24 border-4 border-green-400"><AvatarImage src={partner.photoURL || undefined} /><AvatarFallback>{partner.username?.charAt(0)}</AvatarFallback></Avatar>
                <div className='flex gap-2'>
                    <Button onClick={() => router.push(`/dm/${partner.permChatId}`)}><MessageCircle className="mr-2 h-4 w-4"/> Mesaj Gönder</Button>
                    <Button variant="secondary" onClick={() => router.push(`/profile/${partner.uid}`)}>Profili Gör</Button>
                </div>
            </CardContent>
        </Card>
    );
}

function MatchFailedCard() {
    return (
        <Card className="w-full max-w-sm text-center bg-destructive/10 border-destructive/30">
            <CardHeader><CardTitle className="text-destructive">Eşleşme Olmadı</CardTitle><CardDescription>Bu sefer olmadı. Yeni bir maceraya atılmak için tekrar dene!</CardDescription></CardHeader>
            <CardContent><Button asChild><Link href="/matchmaking">Yeni Eşleşme Ara</Link></Button></CardContent>
        </Card>
    );
}

function PartnerLeftCard() {
    return (
        <Card className="w-full max-w-sm text-center">
            <CardHeader><CardTitle>Partnerin Sohbetten Ayrıldı</CardTitle><CardDescription>Yeni bir eşleşme aramak için ana sayfaya dönebilirsin.</CardDescription></CardHeader>
            <CardContent><Button asChild><Link href="/matchmaking">Yeni Eşleşme Ara</Link></Button></CardContent>
        </Card>
    );
}

// Ana sayfa bileşeni
export default function MatchmakingChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const chatId = params.chatId as string;

  const [chat, setChat] = useState<MatchmakingChat | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION_SECONDS);
  const [isLiking, setIsLiking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Sohbet verilerini ve mesajları dinle
  useEffect(() => {
    if (!user || !chatId) return;

    const chatDocRef = doc(db, 'matchRooms', chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const chatData = { id: docSnap.id, ...docSnap.data() } as MatchmakingChat;
        setChat(chatData);

        const partnerId = chatData.participantUids.find(uid => uid !== user.uid);
        if (partnerId && !partner) {
            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
            if (partnerDoc.exists()) setPartner(partnerDoc.data() as UserProfile);
        }
      } else {
        router.replace('/matchmaking');
      }
      setLoading(false);
    });

    const messagesColRef = collection(db, `matchRooms/${chatId}/messages`);
    const q = query(messagesColRef, orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId, user, router, partner]);
  
  // Geri sayım sayacını yönet
  useEffect(() => {
    if (!chat || chat.status !== 'active') return;

    const endTime = (chat.createdAt as Timestamp).toMillis() + MATCH_DURATION_SECONDS * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((endTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        endMatch(chatId); // Zaman dolduğunda maçı sonlandır
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [chat, chatId]);

  // Mesajlar geldikçe en alta kaydır
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Kalp butonuna tıklama eylemi
  const handleLike = async () => {
    if (!user || !chat || chat.reactions?.[user.uid]) return;
    setIsLiking(true);
    try {
      await submitMatchReaction(chat.id, user.uid);
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
    } finally {
      setIsLiking(false);
    }
  }

  // Yükleme ekranı
  if (loading || !chat || !partner || !user) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
  // Eşleşme sonuçlarını render et
  const myReaction = chat.reactions?.[user.uid];
  const partnerReaction = chat.reactions?.[chat.participantUids.find(uid => uid !== user.uid)!];
  
  if (chat.status === 'ended') {
    const permanentChatId = chat.permanentChatId || getChatId(user.uid, partner.uid);
    const success = !!(myReaction && partnerReaction);
    return (
        <div className="flex h-full items-center justify-center p-4">
            {success ? <MatchSuccessCard partner={{...partner, permChatId: permanentChatId}} /> : <MatchFailedCard />}
        </div>
    );
  }
  
  if (chat.status === 'abandoned') {
      return <div className="flex h-full items-center justify-center p-4"><PartnerLeftCard /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <MatchmakingChatHeader chat={chat} timeLeft={timeLeft} />
      {/* Partner Bilgileri */}
      <div className="p-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10"><AvatarImage src={partner.photoURL || undefined} /><AvatarFallback>{partner.username.charAt(0)}</AvatarFallback></Avatar>
            <div>
                <p className="font-bold">{partner.username}</p>
                <p className="text-xs text-muted-foreground">{partner.age} yaşında</p>
            </div>
        </div>
        <Button size="icon" variant={myReaction ? 'secondary' : 'destructive'} className='h-12 w-12 rounded-full shadow-lg' onClick={handleLike} disabled={isLiking}>
            {isLiking ? <Loader2 className='h-6 w-6 animate-spin'/> : <Heart className={cn("h-6 w-6 transition-all", myReaction && 'fill-current')}/>}
        </Button>
      </div>
      
      <main ref={chatScrollRef} className="flex-1 overflow-y-auto">
        <TextChat messages={messages} loading={false} room={chat as unknown as Room} />
      </main>
      
      <footer className="p-2 border-t">
        <p className="text-xs text-center text-muted-foreground">Bu geçici bir sohbettir. Kalıcı olmak için ikiniz de kalbe dokunun!</p>
      </footer>
    </div>
  );
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/profile/FollowButton.tsx:
```tsx
// src/components/profile/FollowButton.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { followUser, unfollowUser } from "@/lib/actions/followActions";
import { Loader2 } from "lucide-react";
import type { UserProfile } from "@/lib/types";

interface FollowButtonProps {
  currentUserData: UserProfile | null;
  targetUser: UserProfile;
}

/**
 * Takip etme/çıkarma ve istek gönderme mantığını içeren durum bilgili (stateful) buton.
 * Optimistic UI güncellemeleri ile anlık kullanıcı deneyimi sunar.
 */
export default function FollowButton({ currentUserData, targetUser }: FollowButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Optimistic UI için yerel durum
  const [optimisticState, setOptimisticState] = useState<'following' | 'not_following' | 'request_sent' | null>(null);
  
  const isFollowing = currentUserData?.following?.includes(targetUser.uid);
  const hasSentRequest = targetUser.followRequests?.some((req: any) => req.uid === currentUserData?.uid);

  // Props değiştiğinde optimistic state'i sıfırla
  useEffect(() => {
    setOptimisticState(null);
  }, [isFollowing, hasSentRequest]);

  const handleFollow = async () => {
    if (!currentUserData) {
      toast({ variant: "destructive", description: "Bu işlemi yapmak için giriş yapmalısınız." });
      return;
    }
    setIsLoading(true);

    // Optimistic update
    const nextState = targetUser.privateProfile ? 'request_sent' : 'following';
    setOptimisticState(nextState);

    try {
      await followUser(currentUserData.uid, targetUser.uid, { 
          username: currentUserData.username, 
          photoURL: currentUserData.photoURL || null,
          userAvatarFrame: currentUserData.selectedAvatarFrame || '',
      });
      if (targetUser.privateProfile) {
          toast({ description: "Takip isteği gönderildi."});
      }
    } catch (error: any) {
      // Revert on error
      setOptimisticState(null);
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserData) return;
    setIsLoading(true);

    // Optimistic update
    setOptimisticState('not_following');

    try {
      await unfollowUser(currentUserData.uid, targetUser.uid);
    } catch (error: any) {
      // Revert on error
      setOptimisticState(null);
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!currentUserData || currentUserData.uid === targetUser.uid) {
    return null; // Kendi profilinde veya giriş yapmamışsa butonu gösterme
  }

  // Determine current state (optimistic or from props)
  let currentState: 'following' | 'not_following' | 'request_sent' = 'not_following';
  if (optimisticState) {
    currentState = optimisticState;
  } else if (isFollowing) {
    currentState = 'following';
  } else if (hasSentRequest) {
    currentState = 'request_sent';
  }

  if (isLoading) {
    return <Button disabled className="w-32"><Loader2 className="animate-spin" /></Button>;
  }
  
  if (currentState === 'following') {
    return (
      <Button
        variant={isHovering ? "destructive" : "outline"}
        onClick={handleUnfollow}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="w-28 transition-all"
      >
        {isHovering ? "Takibi Bırak" : "Takiptesin"}
      </Button>
    );
  }

  if (targetUser.privateProfile) {
    if (currentState === 'request_sent') {
      return <Button variant="secondary" disabled className="w-32">İstek Gönderildi</Button>;
    }
    return <Button onClick={handleFollow} className="w-40">Takip İsteği Gönder</Button>;
  }

  return <Button onClick={handleFollow} className="w-28">Takip Et</Button>;
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/profile/FollowListDialog.tsx:
```tsx
// src/components/profile/FollowListDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import UserListItem from './UserListItem';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface FollowListDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  type: 'followers' | 'following';
}

export default function FollowListDialog({
  isOpen,
  onOpenChange,
  userIds,
  type,
}: FollowListDialogProps) {
  const { userData: currentUserData } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || userIds.length === 0) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const fetchedUsers: UserProfile[] = [];
        // Firestore 'in' sorgusu en fazla 30 eleman alabilir, bu yüzden listeyi böl
        for (let i = 0; i < userIds.length; i += 30) {
          const batchIds = userIds.slice(i, i + 30);
          const q = query(
            collection(db, 'users'),
            where('uid', 'in', batchIds)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            fetchedUsers.push(doc.data() as UserProfile);
          });
        }
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Kullanıcı listesi alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, userIds]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {type === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-1 px-4">
              {users.map((user) => (
                <UserListItem key={user.uid} user={user} currentUserData={currentUserData} />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-muted-foreground">
                <p>Burada gösterilecek kimse yok.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/profile/ProfileViewLogger.tsx:
```tsx
// src/components/profile/ProfileViewLogger.tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';
import { logProfileView } from '@/lib/actions/profileActions';
import { useEffect } from 'react';

export default function ProfileViewLogger({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  useEffect(() => {
    if (user && user.uid !== targetUserId) {
      logProfileView(targetUserId, user.uid);
    }
  }, [user, targetUserId]);

  return null; // This component renders nothing.
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/profile/ProfileViewerList.tsx:
```tsx
// src/components/profile/ProfileViewerList.tsx
'use client';

import { useEffect, useState } from 'react';
import { getProfileViewers } from '@/lib/actions/profileActions';
import type { ProfileViewer } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ProfileViewerList() {
    const { user } = useAuth();
    const [viewers, setViewers] = useState<ProfileViewer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getProfileViewers(user.uid)
                .then(setViewers)
                .finally(() => setLoading(false));
        }
    }, [user]);

    if (loading) {
        return <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    if (viewers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <EyeOff className="h-10 w-10 mb-2"/>
                <p className="font-semibold">Henüz kimse profilini ziyaret etmedi.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 pt-2">
            {viewers.map((viewer) => (
                <div key={viewer.uid} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                    <Link href={`/profile/${viewer.uid}`} className="flex items-center gap-3 group flex-1">
                        <div className={cn("avatar-frame-wrapper", viewer.selectedAvatarFrame)}>
                            <Avatar className="relative z-[1] h-11 w-11">
                                <AvatarImage src={viewer.photoURL || undefined} />
                                <AvatarFallback>{viewer.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                             <p className="font-semibold group-hover:underline">{viewer.username}</p>
                             <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(viewer.viewedAt as any), { addSuffix: true, locale: tr })}</p>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/profile/UserListItem.tsx:
```tsx
// src/components/profile/UserListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import FollowButton from './FollowButton';
import { cn } from '@/lib/utils';

interface UserListItemProps {
  user: UserProfile;
  currentUserData: UserProfile | null;
}

export default function UserListItem({ user, currentUserData }: UserListItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
      <Link href={`/profile/${user.uid}`} className="flex items-center gap-3 group">
         <div className={cn("avatar-frame-wrapper", user.selectedAvatarFrame)}>
            <Avatar className="relative z-[1] h-10 w-10">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
        </div>
        <span className="font-semibold group-hover:underline">{user.username}</span>
      </Link>
      <FollowButton currentUserData={currentUserData} targetUser={user} />
    </div>
  );
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/voice/ActiveCallBar.tsx:
```tsx
// src/components/voice/ActiveCallBar.tsx
'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, ChevronRight, Users, MicOff as MicOffIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActiveCallBar() {
    const { isConnected, activeRoom, self, participants, leaveRoom, toggleSelfMute } = useVoiceChat();
    const pathname = usePathname();

    const isVisible = isConnected && activeRoom && !pathname.startsWith(`/rooms/${activeRoom.id}`) && !pathname.startsWith('/call/');

    if (!isVisible || !activeRoom) {
        return null;
    }

    const isMuted = self?.isMuted;
    const isSpeaking = self?.isSpeaker;

    return (
        <AnimatePresence>
            {isVisible && (
                 <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-[76px] left-0 right-0 z-40 px-2 pointer-events-none"
                 >
                    <div className="flex items-center justify-between gap-2 bg-primary/90 text-primary-foreground p-2 rounded-2xl shadow-lg w-full max-w-md mx-auto pointer-events-auto">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                             <div className={cn("flex items-center justify-center h-8 w-8 rounded-full bg-white/20 flex-shrink-0 transition-all ring-2", isSpeaking && !isMuted ? "ring-green-400" : "ring-transparent")}>
                                <Mic className={cn("h-5 w-5", isMuted && "hidden")} />
                                <MicOffIcon className={cn("h-5 w-5", !isMuted && "hidden")} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-bold truncate text-sm">{activeRoom.name}</p>
                                <div className="flex items-center gap-1 text-xs opacity-80">
                                    <Users className="h-3 w-3" />
                                    <span>{participants.length} kişi</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button size="sm" className="rounded-full bg-white text-primary hover:bg-white/90" asChild>
                                <Link href={`/rooms/${activeRoom.id}`}>
                                    Geri Dön
                                    <ChevronRight className="h-4 w-4 ml-1"/>
                                </Link>
                            </Button>
                            <Button size="icon" variant="destructive" className="rounded-full h-9 w-9" onClick={leaveRoom}>
                                <PhoneOff className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                 </motion.div>
            )}
        </AnimatePresence>
    );
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/voice/ActiveDmCallBar.tsx:
```tsx
// src/components/voice/ActiveDmCallBar.tsx
// This component has been disabled from the UI.
export default function ActiveDmCallBar() {
    return null;
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/voice/MusicPlayerDialog.tsx:
```tsx

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { ScrollArea } from '../ui/scroll-area';
import { Music, Plus, Play, Pause, SkipForward, SkipBack, Trash2, ListMusic, User, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MusicPlayerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

export default function MusicPlayerDialog({ isOpen, onOpenChange, roomId }: MusicPlayerDialogProps) {
    const { user } = useAuth();
    const {
        livePlaylist,
        isCurrentUserDj,
        isDjActive,
        currentTrack,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        togglePlayback,
        skipTrack,
    } = useVoiceChat();
    const musicInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
    
        setIsAdding(true);
        let addedCount = 0;
    
        for (const file of Array.from(files)) {
            if (file.size > 15 * 1024 * 1024) { // 15MB limit
                toast({
                    variant: "destructive",
                    title: "Dosya Çok Büyük",
                    description: `"${file.name}" (15MB'dan büyük) atlandı.`
                });
                continue; // Skip this file and continue with the next
            }
    
            try {
                const fileDataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = (error) => reject(error);
                });
                
                await addTrackToPlaylist({
                    fileName: file.name,
                    fileDataUrl,
                });
                
                addedCount++;
    
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    description: `"${file.name}" eklenirken bir hata oluştu: ${error.message}`
                });
            }
        }
    
        if (addedCount > 0) {
            toast({
                title: "Başarılı",
                description: `${addedCount} şarkı çalma listesine eklendi.`
            });
        }
    
        setIsAdding(false);
        if (event.target) {
            event.target.value = ""; // Reset file input
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ListMusic /> Müzik Çalar</DialogTitle>
                <DialogDescription>Oda için ortak bir çalma listesi oluşturun. Sadece bir kişi DJ olabilir.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex flex-col gap-4 py-4 overflow-hidden">
                {/* Player Controls */}
                <div className="p-3 rounded-lg bg-muted flex flex-col items-center justify-center min-h-[120px]">
                    {currentTrack ? (
                        <p className="font-semibold text-center truncate">{currentTrack.name}</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">Şu anda çalan bir şey yok.</p>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => skipTrack('previous')} disabled={!isCurrentUserDj}>
                            <SkipBack />
                        </Button>
                        <Button variant="default" size="icon" className="rounded-full h-14 w-14" onClick={togglePlayback} disabled={!isCurrentUserDj && isDjActive}>
                            {currentTrack?.isPlaying ? <Pause size={24}/> : <Play size={24}/>}
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => skipTrack('next')} disabled={!isCurrentUserDj}>
                            <SkipForward />
                        </Button>
                    </div>
                </div>

                 <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Sıradaki Şarkılar</h4>
                    <input type="file" ref={musicInputRef} onChange={handleFileChange} accept="audio/*,.mp3,.m4a,.wav,.ogg" className="hidden" multiple />
                    <Button variant="outline" size="sm" onClick={() => musicInputRef.current?.click()} disabled={isAdding}>
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Plus className="mr-2 h-4 w-4" /> }
                         Müzik Ekle
                    </Button>
                </div>
                
                {/* Playlist */}
                <ScrollArea className="flex-1 rounded-md border">
                    <div className="p-2">
                        {livePlaylist.length > 0 ? (
                            livePlaylist.map((track, index) => (
                                <div key={track.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                                    <Music className="h-4 w-4 text-muted-foreground"/>
                                    <div className="flex-1">
                                        <p className="text-sm truncate">{track.name}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/>{track.addedByUsername}</p>
                                    </div>
                                    {(isCurrentUserDj || track.addedByUid === user?.uid) && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTrackFromPlaylist(track.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-muted-foreground p-4">Çalma listesi boş.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>
            
            <DialogFooter>
                <Button variant="secondary" onClick={() => onOpenChange(false)}>Kapat</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/voice/PersistentVoiceBar.tsx:
```tsx
// This file is obsolete and has been removed to clean up the project.

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/voice/RoomFooter.tsx:
```tsx
// src/components/voice/RoomFooter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Mic, MicOff, Settings, LogOut, Loader2, ScreenShareOff, ScreenShare, Music, Camera, CameraOff, SwitchCamera } from 'lucide-react';
import ChatMessageInput from '../chat/ChatMessageInput';
import type { Room } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import MusicPlayerDialog from '../voice/MusicPlayerDialog';


interface RoomFooterProps {
    room: Room;
    onGameLobbyOpen: () => void;
}

export default function RoomFooter({ room, onGameLobbyOpen }: RoomFooterProps) {
    const { user } = useAuth();
    const { 
        isConnected, 
        isConnecting, 
        joinRoom, 
        leaveRoom, 
        self, 
        toggleSelfMute,
        isSharingScreen,
        startScreenShare,
        stopScreenShare,
        isSharingVideo,
        startVideo,
        stopVideo,
        switchCamera,
    } = useVoiceChat();
    const [showVideoConfirm, setShowVideoConfirm] = useState(false);
    const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
    
    const isParticipant = room.participants.some(p => p.uid === user?.uid);

    const handleJoinLeave = () => {
        if (isConnected) {
            leaveRoom();
        } else {
            joinRoom();
        }
    };
    
    const handleScreenShare = () => {
        if (isSharingScreen) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    };

    const handleVideoToggle = () => {
        if (isSharingVideo) {
            stopVideo();
        } else {
            setShowVideoConfirm(true);
        }
    }

    const handleMusicButtonClick = () => {
        setIsMusicPlayerOpen(true);
    };

    return (
        <>
            <footer className="sticky bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-t p-2">
                <div className="flex w-full items-center space-x-2">
                    <ChatMessageInput room={room} />
                    <Button onClick={toggleSelfMute} variant="secondary" size="icon" className="rounded-full flex-shrink-0" disabled={!isConnected}>
                        {self?.isMuted ? <MicOff className="h-5 w-5 text-destructive"/> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full flex-shrink-0">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" side="top" className="w-auto p-2 space-y-2">
                            <div className="flex items-center gap-1 bg-background rounded-full">
                                <Button onClick={handleJoinLeave} variant="secondary" className="rounded-full px-4" disabled={isConnecting}>
                                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : isConnected ? <><LogOut className="mr-2 h-4 w-4"/>Ayrıl</> : 'Katıl'}
                                </Button>
                                <Button onClick={handleVideoToggle} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                                {isSharingVideo ? <CameraOff className="text-destructive"/> : <Camera />}
                                </Button>
                                <Button onClick={switchCamera} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected || !isSharingVideo}>
                                    <SwitchCamera />
                                </Button>
                                <Button onClick={handleScreenShare} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                                {isSharingScreen ? <ScreenShareOff className="text-destructive"/> : <ScreenShare />}
                                </Button>
                                <Button onClick={handleMusicButtonClick} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                                    <Music />
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                </div>
            </footer>
             <MusicPlayerDialog 
                isOpen={isMusicPlayerOpen}
                onOpenChange={setIsMusicPlayerOpen}
                roomId={room.id}
            />
            <AlertDialog open={showVideoConfirm} onOpenChange={setShowVideoConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kamerayı Aç?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Görüntünüz odadaki herkesle paylaşılacak. Devam etmek istediğinizden emin misiniz?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            startVideo();
                            setShowVideoConfirm(false);
                        }}>
                            Evet, Kamerayı Aç
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/voice/VoiceAudioPlayer.tsx:
```tsx
// src/components/voice/VoiceAudioPlayer.tsx
'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { useEffect, useRef } from 'react';

/**
 * Bu bileşen, arkaplanda çalışarak diğer kullanıcılardan gelen
 * ses akışlarını (MediaStream) bir <audio> elementine bağlayıp oynatır.
 * Arayüzde görünmezdir.
 */
export default function VoiceAudioPlayer() {
    const { remoteAudioStreams } = useVoiceChat();
    
    return (
        <div style={{ display: 'none' }}>
            {Object.entries(remoteAudioStreams).map(([uid, stream]) => (
                <AudioElement key={uid} stream={stream} />
            ))}
        </div>
    );
}

function AudioElement({ stream }: { stream: MediaStream }) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return <audio ref={audioRef} autoPlay playsInline />;
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/components/voice/VoiceUserIcon.tsx:
```tsx
// src/components/voice/VoiceUserIcon.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { kickFromVoice } from "@/lib/actions/roomActions";
import type { VoiceParticipant, Room } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Crown,
  Mic,
  MicOff,
  LogOut,
  Loader2,
  User,
  Shield,
  VolumeX,
  UserCheck,
  UserX,
  CameraOff,
  BadgeCheck
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { useVoiceChat } from "@/contexts/VoiceChatContext";


interface VoiceUserIconProps {
  participant: VoiceParticipant;
  room: Room;
  isHost: boolean;
  isModerator: boolean;
  currentUserId: string;
  size?: 'sm' | 'lg';
}

const VideoView = React.memo(({ stream }: { stream: MediaStream | null }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);
    return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />;
});
VideoView.displayName = 'VideoView';


export default function VoiceUserIcon({
  participant,
  room,
  isHost,
  isModerator,
  currentUserId,
  size = 'sm',
}: VoiceUserIconProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const { localStream, remoteVideoStreams } = useVoiceChat();

  const isSelf = participant.uid === currentUserId;
  const isParticipantHost = participant.uid === room.createdBy.uid;
  const isParticipantModerator = room.moderators?.includes(participant.uid);
  const isParticipantAdmin = participant.role === 'admin';

  const canModerate = isHost || isModerator;
  
  const videoStream = participant.isSharingVideo
    ? (isSelf ? localStream : remoteVideoStreams[participant.uid] || null)
    : null;

  const handleKick = async () => {
    if (!canModerate) return;
    setIsProcessing(true);
    try {
      await kickFromVoice(room.id, currentUserId, participant.uid);
      toast({ description: `${participant.username} sesten atıldı.`})
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleViewProfile = () => {
      router.push(`/profile/${participant.uid}`);
  }

  const menuContent = (
    <DropdownMenuContent align="center" className="bg-card border">
      <DropdownMenuLabel>{participant.username}</DropdownMenuLabel>
      <DropdownMenuSeparator/>
       <DropdownMenuItem onClick={handleViewProfile}>
          <User className="mr-2 h-4 w-4" />
          <span>Profili Görüntüle</span>
      </DropdownMenuItem>
      {canModerate && !isSelf && !isParticipantHost && (
        <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleKick}
            >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sesten At</span>
            </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );
  
  const nameSize = size === 'lg' ? "text-base" : "text-xs";
  const avatarSize = size === 'lg' ? "h-24 w-24" : "w-full aspect-square";
  const fallbackTextSize = size === 'lg' ? "text-4xl" : "text-xl";
  const iconBadgePos = size === 'lg' ? "bottom-1 right-1 p-2" : "bottom-0 right-0 p-1.5";
  const iconSize = size === 'lg' ? "h-5 w-5" : "h-4 w-4";
  
  const speakingRing = participant.isSpeaker;
  
  const avatarContent = (
    <div className={cn("relative z-[1] border-2 transition-all duration-300 w-full h-full rounded-full overflow-hidden",
        speakingRing ? "border-green-500 shadow-lg shadow-green-500/50 ring-4 ring-green-500/30" : "border-transparent",
    )}>
        {videoStream ? (
            <VideoView stream={videoStream} />
        ) : (
            <Avatar className="w-full h-full">
                <AvatarImage src={participant.photoURL || undefined} />
                <AvatarFallback className={cn("bg-muted text-muted-foreground", fallbackTextSize)}>
                {participant.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
        )}
    </div>
  );


  const avatar = (
    <div className="relative flex flex-col items-center gap-2">
       <div className={cn("relative", avatarSize)}>
           <div className={cn("avatar-frame-wrapper w-full h-full", participant.selectedAvatarFrame)}>
              {avatarContent}
          </div>
          <div className={cn("absolute bg-card/70 backdrop-blur-sm rounded-full shadow-md z-10 flex items-center gap-1.5", iconBadgePos)}>
            {participant.isMuted ? (
              <MicOff className={cn(iconSize, "text-destructive")} />
            ) : (
              <Mic className={cn(iconSize, "text-foreground")} />
            )}
            {participant.isSharingVideo && <CameraOff className={cn(iconSize, "text-blue-400")} />}
          </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 w-full">
          <p className={cn("font-bold text-foreground truncate", nameSize, size === 'lg' ? 'max-w-[120px]' : 'max-w-[60px]')}>{participant.username}</p>
           {isParticipantAdmin ? (
                 <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <BadgeCheck className={cn("text-primary shrink-0", iconSize)} />
                        </TooltipTrigger>
                        <TooltipContent><p>Yönetici</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : isParticipantHost && size === 'sm' ? (
              <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Crown className={cn("text-yellow-400 shrink-0", iconSize)} />
                    </TooltipTrigger>
                    <TooltipContent><p>Oda Sahibi</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          ) : isParticipantModerator && !isParticipantHost && size === 'sm' ? (
              <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Shield className={cn("text-blue-400 shrink-0", iconSize)} />
                    </TooltipTrigger>
                    <TooltipContent><p>Moderatör</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          ) : null}
      </div>
    </div>
  );

  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isProcessing}
            className="cursor-pointer rounded-full text-center"
          >
            {isProcessing ? (
              <div className={cn("flex items-center justify-center rounded-full bg-muted/50", avatarSize)}>
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              avatar
            )}
          </button>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    );
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/lib/actions/liveActions.ts:
```ts
'use server';
import { db } from '@/lib/firebase';
import { doc, collection, addDoc, serverTimestamp, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

interface HostInfo {
  uid: string;
  username: string;
  photoURL: string | null;
}

export async function startLiveStream(host: HostInfo, title: string) {
  if (!host || !host.uid) throw new Error("Host information is required.");
  if (!title.trim()) throw new Error("A title is required to start a live stream.");

  const livesRef = collection(db, 'lives');
  const newLiveDoc = await addDoc(livesRef, {
    hostId: host.uid,
    hostUsername: host.username,
    hostPhotoURL: host.photoURL,
    title,
    status: 'live',
    viewerCount: 0,
    createdAt: serverTimestamp(),
  });

  revalidatePath('/live');
  return { success: true, liveId: newLiveDoc.id };
}

export async function endLiveStream(liveId: string, hostId: string) {
  if (!liveId || !hostId) throw new Error("Live ID and Host ID are required.");

  const liveRef = doc(db, 'lives', liveId);
  const liveDoc = await getDoc(liveRef);

  if (!liveDoc.exists() || liveDoc.data().hostId !== hostId) {
    throw new Error("Live stream not found or you do not have permission to end it.");
  }

  await updateDoc(liveRef, {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
  
  // In a real scenario, you'd also cleanup the streaming server resources here.
  
  revalidatePath('/live');
  revalidatePath(`/live/${liveId}`);
  return { success: true };
}

```
- yeniyedek/durmadanyedek/yeniyedek/src/lib/actions/matchmakingActions.ts:
```ts
// Bu dosya, kaldırılan "Hızlı Eşleşme" özelliğiyle ilgili olduğu için artık kullanılmamaktadır ve güvenle silinebilir.

```
- yeniyedek/durmadanyedek/yeniyedek/src/lib/workbox.ts:
```ts
'use client';
import { Workbox } from 'workbox-window';

let wb: Workbox | undefined;

export const registerServiceWorker = () => {
    if (process.env.NODE_ENV === 'development') {
        return;
    }
  
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
        wb = new Workbox('/sw.js');
        
        wb.addEventListener('waiting', (event) => {
            // An an 'update' is available, we can ask it to take control immediately.
            console.log('A new service worker is waiting to be activated.');
            wb?.messageSkipWaiting();
        });

        wb.addEventListener('activated', (event) => {
            // This event is fired when the new service worker has taken control.
            // It's a good time to reload the page to use the new assets.
            if (event.isUpdate) {
                console.log('Service worker has been updated. Reloading page...');
                window.location.reload();
            } else {
                console.log('Service worker activated for the first time!');
            }
        });

        wb.register();
    }
};

```
- yeniyedek/durmadanyedek/yeniyedek/tailwind.config.ts:
```ts
import type {Config} from 'tailwindcss';
import {fontFamily} from 'tailwindcss/defaultTheme';

export default {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'like-pop': {
            '0%': { opacity: '0', transform: 'scale(0.5)' },
            '30%': { opacity: '0.9', transform: 'scale(1.2)' },
            '60%': { opacity: '0.9', transform: 'scale(1)' },
            '100%': { opacity: '0', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'like-pop': 'like-pop 0.6s ease-in-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

```
- yeniyedek/durmadanyedek/yeniyedek/tools.txt:
```txt

changed 158 packages in 36s

16 packages are looking for funding
  run `npm fund` for details

```
- yeniyedek/durmadanyedek/yeniyedek/tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```
- yeniyedek/firebase.json:
```json

{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": {
      "region": "us-central1"
    }
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" install",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  }
}



```
- yeniyedek/firestore.indexes.json:
```json

{
  "indexes": [
    {
      "collectionGroup": "calls",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "participantUids",
          "arrayConfig": "CONTAINS"
        }
      ]
    },
    {
      "collectionGroup": "directMessagesMetadata",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "participantUids",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "lastMessage.timestamp",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "dms",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "participantUids",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "lastMessageTimestamp",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "games",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "finishedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "read",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "recipientId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "rooms",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "voiceParticipantsCount",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "calls",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {
          "fieldPath": "receiverId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {
          "fieldPath": "uid",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userGender",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "username",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "comments",
      "fieldPath": "createdAt",
      "ttl": false,
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        },
        {
          "order": "DESCENDING",
          "queryScope": "COLLECTION"
        },
        {
          "arrayConfig": "CONTAINS",
          "queryScope": "COLLECTION"
        },
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION_GROUP"
        }
      ]
    }
  ]
}

```
- yeniyedek/package.json:
```json

{
  "name": "nextn",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "genkit:dev": "genkit start -- tsx src/ai/dev.ts",
    "genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ducanh2912/next-pwa": "^10.2.7",
    "@genkit-ai/googleai": "1.1.0",
    "@hookform/resolvers": "^4.1.3",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-menubar": "^1.1.6",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-radio-group": "^1.2.3",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-switch": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "dotenv": "^16.5.0",
    "firebase": "^11.9.1",
    "framer-motion": "^11.2.12",
    "genkit": "1.1.0",
    "i18next": "^23.11.5",
    "i18next-browser-languagedetector": "^8.0.0",
    "lucide-react": "^0.475.0",
    "next": "14.2.4",
    "next-themes": "^0.3.0",
    "patch-package": "^8.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.54.2",
    "react-i18next": "^14.1.2",
    "react-image-crop": "^11.0.5",
    "recharts": "^2.15.1",
    "tailwind-merge": "^3.0.1",
    "tailwindcss-animate": "^1.0.7",
    "uuid": "^9.0.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.8",
    "autoprefixer": "^10.4.19",
    "genkit-cli": "1.1.0",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}

```
- yeniyedek/postcss.config.js:
```js

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```
- yeniyedek/src/app/globals.css:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 1rem;
  }
 
  .dark {
    --background: 0 0% 0%;
    --foreground: 210 40% 98%;
    --card: 0 0% 2.5%;
    --card-foreground: 210 40% 98%;
    --popover: 0 0% 2%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 210 40% 98%;
    --secondary: 0 0% 8%;
    --secondary-foreground: 210 40% 98%;
    --muted: 0 0% 8%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 0 0% 8%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 0 0% 8%;
    --input: 0 0% 8%;
    --ring: 217.2 91.2% 59.8%;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    -webkit-user-select: none; /* Safari */
    -moz-user-select: none;    /* Firefox */
    -ms-user-select: none;     /* IE10+/Edge */
    user-select: none;         /* Standard */
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior-y: contain;
  }
  .auth-bg {
    background: linear-gradient(-45deg, #ef4444, #dc2626, #3b82f6, #2563eb);
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
  }

  @keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
}

/* Chat Bubble Styles */
@layer components {
  .bubble-wrapper {
    @apply absolute -inset-2 pointer-events-none;
  }
  .bubble {
    @apply absolute rounded-full;
    animation: float 6s ease-in-out infinite;
  }

  /* Bubble Animation */
  @keyframes float {
    0% { transform: translateY(0px) scale(1); opacity: 0.7; }
    50% { transform: translateY(-20px) scale(1.1); opacity: 1; }
    100% { transform: translateY(0px) scale(1); opacity: 0.7; }
  }

  /* Style 1: Neon Party */
  .bubble-style-1 .bubble:nth-child(1) { @apply bg-fuchsia-500 w-3 h-3 top-[5%] left-[75%]; animation-delay: 0s; }
  .bubble-style-1 .bubble:nth-child(2) { @apply bg-cyan-400 w-4 h-4 top-[70%] left-[5%]; animation-delay: 1.5s; }
  .bubble-style-1 .bubble:nth-child(3) { @apply bg-lime-400 w-2 h-2 top-[85%] left-[80%]; animation-delay: 3s; }
  .bubble-style-1 .bubble:nth-child(4) { @apply bg-rose-500 w-3 h-3 top-[30%] left-[10%]; animation-delay: 4.5s; }
  .bubble-style-1 .bubble:nth-child(5) { @apply bg-orange-400 w-2 h-2 top-[5%] left-[20%]; animation-delay: 2s; }

  /* Style 2: Ocean Deep */
  .bubble-style-2 .bubble:nth-child(1) { @apply bg-blue-500 w-4 h-4 top-[5%] left-[15%]; animation-delay: 0s; }
  .bubble-style-2 .bubble:nth-child(2) { @apply bg-teal-400 w-3 h-3 top-[65%] left-[80%]; animation-delay: 1s; }
  .bubble-style-2 .bubble:nth-child(3) { @apply bg-sky-300 w-2 h-2 top-[90%] left-[15%]; animation-delay: 2s; }
  .bubble-style-2 .bubble:nth-child(4) { @apply bg-indigo-400 w-4 h-4 top-[30%] left-[70%]; animation-delay: 3s; }
  .bubble-style-2 .bubble:nth-child(5) { @apply bg-cyan-200 w-2 h-2 top-[50%] left-[5%]; animation-delay: 4s; }

  /* Style 3: Sunset Glow */
  .bubble-style-3 .bubble:nth-child(1) { @apply bg-red-500 w-3 h-3 top-[85%] left-[75%]; animation-delay: 0s; }
  .bubble-style-3 .bubble:nth-child(2) { @apply bg-orange-500 w-4 h-4 top-[15%] left-[5%]; animation-delay: 0.5s; }
  .bubble-style-3 .bubble:nth-child(3) { @apply bg-amber-400 w-2 h-2 top-[50%] left-[80%]; animation-delay: 1s; }
  .bubble-style-3 .bubble:nth-child(4) { @apply bg-yellow-300 w-3 h-3 top-[85%] left-[20%]; animation-delay: 1.5s; }
  .bubble-style-3 .bubble:nth-child(5) { @apply bg-pink-400 w-2 h-2 top-[5%] left-[60%]; animation-delay: 2s; }

  /* Style 4: Forest Whisper */
  .bubble-style-4 .bubble:nth-child(1) { @apply bg-green-600 w-3 h-3 top-[20%] left-[5%]; animation-delay: 0s; }
  .bubble-style-4 .bubble:nth-child(2) { @apply bg-emerald-500 w-4 h-4 top-[75%] left-[75%]; animation-delay: 1.2s; }
  .bubble-style-4 .bubble:nth-child(3) { @apply bg-lime-500 w-2 h-2 top-[90%] left-[5%]; animation-delay: 2.4s; }
  .bubble-style-4 .bubble:nth-child(4) { @apply bg-teal-400 w-3 h-3 top-[5%] left-[75%]; animation-delay: 3.6s; }
  .bubble-style-4 .bubble:nth-child(5) { @apply bg-green-300 w-2 h-2 top-[50%] left-[40%]; animation-delay: 4.8s; }

  /* Style 5: Fiery */
  .bubble-style-fire {
      filter: blur(0.5px);
  }
  .bubble-style-fire .bubble {
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      animation: flame-float 3s ease-in-out infinite, flame-flicker 1.5s ease-in-out infinite;
  }
  .bubble-style-fire .bubble:nth-child(1) { @apply bg-red-600 w-4 h-5 top-[60%] left-[10%]; animation-delay: 0s; }
  .bubble-style-fire .bubble:nth-child(2) { @apply bg-orange-500 w-3 h-4 top-[15%] left-[80%]; animation-delay: 0.5s; }
  .bubble-style-fire .bubble:nth-child(3) { @apply bg-yellow-400 w-2 h-3 top-[75%] left-[60%]; animation-delay: 1s; }
  .bubble-style-fire .bubble:nth-child(4) { @apply bg-orange-400 w-4 h-4 top-[80%] left-[25%]; animation-delay: 1.5s; }
  .bubble-style-fire .bubble:nth-child(5) { @apply bg-red-500 w-3 h-3 top-[5%] left-[40%]; animation-delay: 2s; }

  @keyframes flame-float {
    0% { transform: translateY(0) rotate(-5deg); opacity: 0.8; }
    50% { transform: translateY(-15px) rotate(5deg); opacity: 1; }
    100% { transform: translateY(0) rotate(-5deg); opacity: 0.8; }
  }
  @keyframes flame-flicker {
    0% { transform: scale(1); box-shadow: 0 0 10px #fef08a, 0 0 20px #f97316; }
    50% { transform: scale(1.1); box-shadow: 0 0 15px #fef08a, 0 0 30px #f97316; }
    100% { transform: scale(1); box-shadow: 0 0 10px #fef08a, 0 0 20px #f97316; }
  }

  /* NEW: Premium Gold Bubble */
  .bubble-style-premium .bubble {
    animation-name: float, premium-flicker;
    animation-duration: 4s, 2s;
    animation-timing-function: ease-in-out, ease-in-out;
    animation-iteration-count: infinite, infinite;
  }
  .bubble-style-premium .bubble:nth-child(1) { @apply bg-amber-400 w-3 h-3 top-[10%] left-[80%]; animation-delay: 0s; }
  .bubble-style-premium .bubble:nth-child(2) { @apply bg-yellow-500 w-4 h-4 top-[75%] left-[10%]; animation-delay: 1s; }
  .bubble-style-premium .bubble:nth-child(3) { @apply bg-amber-300 w-2 h-2 top-[90%] left-[90%]; animation-delay: 2s; }
  .bubble-style-premium .bubble:nth-child(4) { @apply bg-yellow-400 w-3 h-3 top-[35%] left-[20%]; animation-delay: 3s; }
  .bubble-style-premium .bubble:nth-child(5) { @apply bg-amber-200 w-2 h-2 top-[5%] left-[30%]; animation-delay: 1.5s; }

  @keyframes premium-flicker {
    0%, 100% { box-shadow: 0 0 5px #fcd34d, 0 0 10px #f59e0b; }
    50% { box-shadow: 0 0 10px #fcd34d, 0 0 20px #f59e0b; }
  }
}

/* Avatar Frame Styles */
@layer components {
  .avatar-frame-wrapper {
    position: relative;
  }
  .avatar-frame-angel::before, .avatar-frame-angel::after,
  .avatar-frame-devil::before, .avatar-frame-devil::after,
  .avatar-frame-snake::before,
  .avatar-frame-tech::before,
  .avatar-frame-premium::before {
    content: '';
    position: absolute;
    pointer-events: none;
    z-index: 2;
  }

  .avatar-frame-angel::before, .avatar-frame-angel::after,
  .avatar-frame-devil::before, .avatar-frame-devil::after {
    top: 50%;
    width: 50%;
    height: 50%;
    background-size: contain;
    background-repeat: no-repeat;
    transform: translateY(-50%);
    transition: transform 0.3s ease-in-out;
  }
  .avatar-frame-wrapper:hover .avatar-frame-angel::before,
  .avatar-frame-wrapper:hover .avatar-frame-angel::after,
  .avatar-frame-wrapper:hover .avatar-frame-devil::before,
  .avatar-frame-wrapper:hover .avatar-frame-devil::after {
     transform: translateY(-50%) scale(1.1);
  }

  @keyframes wing-flap {
    0%, 100% { transform: translateY(-50%) rotateZ(-5deg) scale(1.0); }
    50% { transform: translateY(-50%) rotateZ(5deg) scale(1.05); }
  }

  /* Angel Wings */
  .avatar-frame-angel::before {
    left: 0;
    transform-origin: bottom right;
    animation: wing-flap 2.5s ease-in-out infinite;
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cfilter id='angel-glow' x='-50%25' y='-50%25' width='200%25' height='200%25'%3e%3cfeGaussianBlur stdDeviation='3' result='coloredBlur'/%3e%3cfeMerge%3e%3cfeMergeNode in='coloredBlur'/%3e%3cfeMergeNode in='SourceGraphic'/%3e%3c/feMerge%3e%3c/filter%3e%3c/defs%3e%3cpath d='M95,50 C70,20 50,30 20,0 C40,50 40,70 95,50 Z' fill='rgba(255,255,255,0.9)' filter='url(%23angel-glow)'/%3e%3c/svg%3e");
  }
  .avatar-frame-angel::after {
    right: 0;
    transform: translateY(-50%) scaleX(-1);
    transform-origin: bottom left;
    animation: wing-flap 2.5s ease-in-out infinite reverse;
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cfilter id='angel-glow' x='-50%25' y='-50%25' width='200%25' height='200%25'%3e%3cfeGaussianBlur stdDeviation='3' result='coloredBlur'/%3e%3cfeMerge%3e%3cfeMergeNode in='coloredBlur'/%3e%3cfeMergeNode in='SourceGraphic'/%3e%3c/feMerge%3e%3c/filter%3e%3c/defs%3e%3cpath d='M95,50 C70,20 50,30 20,0 C40,50 40,70 95,50 Z' fill='rgba(255,255,255,0.9)' filter='url(%23angel-glow)'/%3e%3c/svg%3e");
  }

  /* Devil Wings */
  .avatar-frame-devil::before {
    left: 0;
    top: 45%;
    transform-origin: top right;
    animation: wing-flap 3s ease-in-out infinite;
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3clinearGradient id='devil-grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3e%3cstop offset='0%25' style='stop-color:%23dc2626;stop-opacity:1' /%3e%3cstop offset='100%25' style='stop-color:%234c1d95;stop-opacity:1' /%3e%3c/linearGradient%3e%3cfilter id='devil-glow'%3e%3cfeGaussianBlur stdDeviation='2'/%3e%3c/filter%3e%3c/defs%3e%3cpath d='M5,50 C30,80 50,70 80,100 C60,50 60,30 5,50 Z' fill='url(%23devil-grad)' filter='url(%23devil-glow)'/%3e%3c/svg%3e");
  }
  .avatar-frame-devil::after {
    right: 0;
    top: 45%;
    transform: translateY(-50%) scaleX(-1);
    transform-origin: top left;
    animation: wing-flap 3s ease-in-out infinite reverse;
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3clinearGradient id='devil-grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3e%3cstop offset='0%25' style='stop-color:%23dc2626;stop-opacity:1' /%3e%3cstop offset='100%25' style='stop-color:%234c1d95;stop-opacity:1' /%3e%3c/linearGradient%3e%3cfilter id='devil-glow'%3e%3cfeGaussianBlur stdDeviation='2'/%3e%3c/filter%3e%3c/defs%3e%3cpath d='M5,50 C30,80 50,70 80,100 C60,50 60,30 5,50 Z' fill='url(%23devil-grad)' filter='url(%23devil-glow)'/%3e%3c/svg%3e");
  }

  /* Snake & Tech Frames */
  @keyframes tech-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .avatar-frame-snake::before {
    inset: -4px;
    background-size: 100% 100%;
    animation: tech-orbit 8s linear infinite;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-10 -10 120 120'%3E%3Cpath d='M50,0 A50,50 0 1,1 49.9,0' stroke='%234ade80' stroke-width='6' stroke-dasharray='150 164' fill='none'/%3E%3C/svg%3E");
  }
  .avatar-frame-tech::before {
    inset: -6px;
    background-size: 100% 100%;
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cfilter id='tech-glow'%3e%3cfeGaussianBlur in='SourceGraphic' stdDeviation='2' /%3e%3c/filter%3e%3c/defs%3e%3ccircle cx='60' cy='60' r='55' stroke='%230ea5e9' stroke-width='4' stroke-dasharray='15 25' fill='none' filter='url(%23tech-glow)'%3e%3canimateTransform attributeName='transform' type='rotate' from='0 60 60' to='360 60 60' dur='10s' repeatCount='indefinite' /%3e%3c/circle%3e%3ccircle cx='60' cy='60' r='50' stroke='%2334d399' stroke-width='2' stroke-dasharray='5 15' fill='none'%3e%3canimateTransform attributeName='transform' type='rotate' from='360 60 60' to='0 60 60' dur='15s' repeatCount='indefinite' /%3e%3c/circle%3e%3c/svg%3e");
  }

  /* Premium Gold Avatar Frame */
  .avatar-frame-premium::before {
    inset: -5px;
    border-radius: 9999px;
    border: 2px solid;
    border-color: #f59e0b;
    animation: premium-glow 2s ease-in-out infinite alternate;
  }

  @keyframes premium-glow {
    from {
      box-shadow: 0 0 2px #f59e0b, 0 0 4px #f59e0b, 0 0 6px #d97706;
    }
    to {
      box-shadow: 0 0 4px #f59e0b, 0 0 8px #d97706, 0 0 12px #b45309;
    }
  }
}

/* NEW: Animated DM Input Border */
@layer components {
  .dm-input-glow {
    position: relative;
    padding: 2px; /* Border width */
    border-radius: 9999px; /* rounded-full */
    background: linear-gradient(90deg, #10b981, #8b5cf6, #ec4899);
    animation: dm-glow-anim 4s linear infinite;
    background-size: 200% 200%;
  }

  @keyframes dm-glow-anim {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
}

.event-room-bg {
    background-image:
        radial-gradient(at 27% 37%, hsla(215,98%,61%,0.4) 0px, transparent 50%),
        radial-gradient(at 97% 21%, hsla(125,98%,72%,0.4) 0px, transparent 50%),
        radial-gradient(at 52% 99%, hsla(355,98%,76%,0.4) 0px, transparent 50%),
        radial-gradient(at 10% 29%, hsla(256,96%,68%,0.4) 0px, transparent 50%),
        radial-gradient(at 97% 96%, hsla(38,98%,70%,0.4) 0px, transparent 50%),
        radial-gradient(at 33% 50%, hsla(222,97%,71%,0.4) 0px, transparent 50%),
        radial-gradient(at 79% 53%, hsla(343,98%,74%,0.4) 0px, transparent 50%);
    background-size: 100% 100%;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

@keyframes like-pop {
  0% { opacity: 0; transform: scale(0.5); }
  30% { opacity: 0.9; transform: scale(1.2); }
  60% { opacity: 0.9; transform: scale(1.0); }
  100% { opacity: 0; transform: scale(1.0); }
}
.animate-like-pop {
  animation: like-pop 0.6s ease-in-out forwards;
}

@layer utilities {
  .rooms-page-bg {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3e%3ctext x='50%25' y='50%25' font-size='50' font-weight='bold' fill='hsl(var(--foreground))' fill-opacity='0.03' dominant-baseline='middle' text-anchor='middle' transform='rotate(-20 200 200)'%3eHiweWalk%3c/text%3e%3c/svg%3e");
    background-size: 400px 400px;
    background-repeat: repeat;
  }
}
```
- yeniyedek/src/app/layout.tsx:
```tsx

// Bu dosya, uygulamanın en dış katmanını oluşturan kök düzendir (root layout).
// Tüm sayfalar bu düzenin içinde render edilir.
// HTML ve BODY etiketlerini, temel fontları, tema ve kimlik doğrulama sağlayıcılarını içerir.
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import NetworkStatusNotifier from '@/components/common/NetworkStatusNotifier';
import I18nProvider from '@/components/common/I18nProvider';
import NotificationPermissionManager from '@/components/common/NotificationPermissionManager';

// Google Fonts'tan Inter font ailesini yüklüyoruz.
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-sans', // CSS'te bu değişken adıyla kullanılabilir.
  weight: ['400', '500', '600', '700', '800']
});

// Sayfa meta verileri (SEO ve PWA için önemli).
export const metadata: Metadata = {
  title: 'HiweWalk',
  description: 'Herkese açık odalar oluşturun ve katılın.',
  manifest: '/manifest.json', // PWA manifest dosyası.
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg', // Apple cihazlar için ikon.
  },
  applicationName: "HiweWalk",
  appleWebApp: {
    capable: true, // iOS'ta tam ekran PWA olarak çalışabilir.
    statusBarStyle: "default",
    title: "HiweWalk",
  },
  formatDetection: {
    telephone: false, // Telefon numaralarının otomatik olarak linke çevrilmesini engelle.
  },
};

// Mobil cihazlarda tarayıcı çubuğunun rengi gibi viewport ayarları.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <Script
            id="onesignal-sdk"
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
            strategy="afterInteractive"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased font-medium',
          inter.variable // Inter fontunu tüm body'e uygula.
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Kimlik Doğrulama Sağlayıcısı: Tüm alt bileşenlerin kullanıcı verisine erişmesini sağlar. */}
          <AuthProvider>
             <I18nProvider>
                <NotificationPermissionManager />
                {children}
                <Toaster />
                <NetworkStatusNotifier />
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


```
- yeniyedek/src/app/onboarding/page.tsx:
```tsx
// Bu dosya, yeni kayıt olan kullanıcıların profil kurulumunu yaptığı "Onboarding" (Alıştırma) sayfasını yönetir.
// Kullanıcıyı adım adım profil resmi, biyografi ve takip edeceği kişileri seçmeye yönlendirir.
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Step1Welcome from '@/components/onboarding/Step1Welcome';
import Step2Bio from '@/components/onboarding/Step2Bio';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { updateOnboardingData } from '@/lib/actions/userActions';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Her adımdan gelen verileri tutan state'ler.
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  
  useEffect(() => {
    // Auth yüklemesi bittiğinde ve kullanıcı yoksa, kayıt sayfasına yönlendir.
    if (!authLoading && !user) {
      router.replace('/signup');
    }
    // Eğer kullanıcının zaten bir biyografisi varsa, bu onboarding işlemini tamamlamış demektir.
    // Ana sayfaya yönlendir.
    if (userData && userData.bio) {
        router.replace('/home');
    }
  }, [user, userData, authLoading, router]);

  // Tüm adımlar bittiğinde bu fonksiyon çalışır.
  const handleFinish = async () => {
    if (!user || !userData) return;
    setLoading(true);

    try {
        // Sunucu eylemini çağırarak toplanan verileri veritabanına kaydet.
        await updateOnboardingData({
            userId: user.uid,
            avatarDataUrl,
            bio,
            followingUids: [] // This is now empty
        });
        toast({
            title: "Kurulum Tamamlandı!",
            description: "Harika, artık HiweWalk'u kullanmaya hazırsın.",
        });
        router.push('/home');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Hata",
            description: "Profil güncellenirken bir hata oluştu: " + error.message,
        });
        setLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  // Veriler yüklenene kadar yükleme göstergesi.
  if (authLoading || !user || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // İlerleme çubuğu için yüzde hesaplaması.
  const progress = (step / 2) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md mx-auto">
            <Progress value={progress} className="mb-8" />
            
            <div className="animate-in fade-in-50 duration-500">
                {/* Mevcut adıma göre ilgili bileşeni render et. */}
                {step === 1 && <Step1Welcome onAvatarChange={setAvatarDataUrl} />}
                {step === 2 && <Step2Bio bio={bio} setBio={setBio} />}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
                 {step > 1 ? (
                    <Button variant="outline" onClick={prevStep}>Geri</Button>
                ) : (
                    // İlk adımda kullanıcı atlayabilir.
                    <Button variant="outline" onClick={() => router.push('/home')}>Atla</Button>
                )}
                {step < 2 ? (
                    <Button onClick={nextStep}>İleri</Button>
                ) : (
                    // Son adımda "Bitir" butonu.
                    <Button onClick={handleFinish} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Bitir
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
}

```
- yeniyedek/src/app/signup/page.tsx:
```tsx
// src/app/signup/page.tsx
"use client";

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SignUpForm from '@/components/auth/signup-form';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

/**
 * Kayıt Sayfası
 * 
 * Bu bileşen, `Suspense` kullanarak sayfa içeriğinin yüklenmesini bekler.
 * Bu, özellikle yavaş bağlantılarda veya büyük bileşenlerde kullanıcı deneyimini iyileştirir.
 * İçerik yüklenene kadar bir yükleme animasyonu gösterilir.
 */
export default function SignUpPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  if (loading || user) {
     return <AnimatedLogoLoader fullscreen isAuthPage />;
  }

  return (
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      {/* Asıl sayfa içeriği */}
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
        <div className="w-full animate-in zoom-in-95 duration-500">
          <SignUpForm />
        </div>
      </main>
    </Suspense>
  );
}

```
- yeniyedek/src/components/common/AnimatedLogoLoader.tsx:
```tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const letterVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 12,
    },
  },
};

const text = "HiweWalk";

interface AnimatedLogoLoaderProps {
  fullscreen?: boolean;
  className?: string;
  isAuthPage?: boolean;
}

export default function AnimatedLogoLoader({ fullscreen = false, className, isAuthPage = false }: AnimatedLogoLoaderProps) {
  const loader = (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("flex overflow-hidden text-5xl font-extrabold tracking-tighter", className)}
    >
      {text.split("").map((letter, index) => (
        <motion.span
          key={index}
          variants={letterVariants}
          className={cn("inline-block", isAuthPage ? 'text-white' : 'text-primary')}
        >
          {letter}
        </motion.span>
      ))}
    </motion.div>
  );

  if (fullscreen) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center", isAuthPage ? 'auth-bg' : 'bg-background')}>
        {loader}
      </div>
    );
  }

  return loader;
}
```
- yeniyedek/src/components/common/I18nProvider.tsx:
```tsx
'use client';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { ReactNode, Suspense } from 'react';

/**
 * Bu bileşen, `react-i18next` kütüphanesinin context sağlayıcısını sarmalar.
 * Dil algılama gibi asenkron işlemler için `Suspense` kullanır.
 * Root layout'ta tüm uygulamayı sararak dil yönetimi özelliklerini
 * tüm alt bileşenlere aktarır.
 */
export default function I18nProvider({ children }: { children: ReactNode }) {
    return (
        <Suspense>
            <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </Suspense>
    );
}
```
- yeniyedek/src/components/common/NetworkStatusNotifier.tsx:
```tsx
'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';

export default function NetworkStatusNotifier() {
  const isOnline = useNetworkStatus();
  const { toast, dismiss } = useToast();
  const toastId = useRef<string | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
        firstLoad.current = false;
        // Do nothing on initial load, only on status change.
        return;
    }

    if (isOnline) {
      if (toastId.current) {
        dismiss(toastId.current);
        toastId.current = null;
        toast({
          title: 'Tekrar Çevrimiçisiniz',
          description: 'İnternet bağlantınız geri geldi.',
          className: 'bg-green-100 dark:bg-green-900/30 border-green-400',
        });
      }
    } else {
      const { id } = toast({
        title: 'Çevrimdışısınız',
        description: 'İnternet bağlantınız yok gibi görünüyor. Uygulamanın önbelleğe alınmış bir sürümünü kullanıyorsunuz.',
        variant: 'destructive',
        duration: Infinity,
      });
      toastId.current = id;
    }

    return () => {
        if(toastId.current) {
            dismiss(toastId.current);
        }
    }
  }, [isOnline, toast, dismiss]);

  return null;
}
```
- yeniyedek/src/components/common/NotificationPermissionManager.tsx:
```tsx
'use client';

import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred?: any[];
  }
}

/**
 * Manages all OneSignal SDK interactions: initialization, permission requests,
 * and user identification. This is the single source of truth for OneSignal.
 */
export default function NotificationPermissionManager() {
  const { toast, dismiss } = useToast();
  const { user } = useAuth(); // Get the current user from AuthContext
  const oneSignalAppId = "51c67432-a305-43fc-a4c8-9c5d9d478d1c";

  // Handles the logic for requesting notification permissions from the user.
  const requestPermission = useCallback(() => {
    window.OneSignal?.Notifications.requestPermission();
  }, []);

  // Asks the user to enable notifications via a dismissible toast.
  const promptForPermission = useCallback(() => {
    const { id } = toast({
      title: 'Bildirimleri Etkinleştir',
      description: 'Uygulamadan en iyi şekilde yararlanmak için anlık bildirimlere izin verin.',
      duration: Infinity,
      action: (
        <Button onClick={() => {
          requestPermission();
          dismiss(id);
        }}>
          <BellRing className="mr-2 h-4 w-4" />
          İzin Ver
        </Button>
      ),
    });
  }, [toast, dismiss, requestPermission]);

  // Effect for initializing OneSignal and handling user state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function(OneSignal: any) {
      if (!OneSignal.isInitialized()) {
        console.log('[OneSignal] Initializing SDK...');
        OneSignal.init({
          appId: oneSignalAppId,
          allowLocalhostAsSecureOrigin: true,
          // Explicitly define the service worker path. next-pwa generates sw.js in public root.
          serviceWorkerPath: 'sw.js',
        }).then(() => {
          console.log("[OneSignal] SDK Initialized.");
          
          // Check for permission after init
          if (OneSignal.Notifications.permission === 'default') {
            promptForPermission();
          }

          // Handle user login/logout for identification
          if (user) {
            console.log(`[OneSignal] Identifying user with external ID: ${user.uid}`);
            OneSignal.login(user.uid);
          }
        });
      }

      // Listener for notification permission changes
      OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
        console.log("[OneSignal] New permission state:", permission);
        if (permission) {
            toast({
                title: 'Teşekkürler!',
                description: 'Artık önemli etkinlikler için bildirim alacaksınız.',
            });
        } else {
            toast({
                title: 'Bildirimler Engellendi',
                description: 'Bildirimleri etkinleştirmek için tarayıcı ayarlarınızı kontrol edebilirsiniz.',
                variant: 'destructive'
            });
        }
      });
    });
  }, [oneSignalAppId, promptForPermission, toast, user]);
  
  // This separate effect handles user login/logout after the initial setup.
  useEffect(() => {
     window.OneSignalDeferred = window.OneSignalDeferred || [];
     window.OneSignalDeferred.push(function(OneSignal: any) {
        if (!OneSignal.isInitialized()) {
            return; // Wait for initialization to complete
        }
        if (user) {
            if (!OneSignal.User.hasExternalId() || OneSignal.User.getExternalId() !== user.uid) {
                console.log(`[OneSignal] Auth state changed. Logging in user: ${user.uid}`);
                OneSignal.login(user.uid);
            }
        } else {
            if (OneSignal.User.hasExternalId()) {
                console.log("[OneSignal] Auth state changed. User is null, logging out from OneSignal.");
                OneSignal.logout();
            }
        }
     });
  }, [user]);

  return null; // This component does not render anything
}

```
- yeniyedek/src/components/common/PremiumWelcomeManager.tsx:
```tsx

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Gift } from 'lucide-react';

export default function PremiumWelcomeManager() {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userData) return;

    // Check if the user is premium and if they've seen the welcome message before.
    const isPremium = userData.premiumUntil && userData.premiumUntil.toDate() > new Date();
    const hasSeenWelcomeKey = `hasSeenPremiumWelcome_${userData.uid}`;
    
    // Check localStorage in a try-catch block for environments where it might not be available.
    let hasSeenWelcome = false;
    try {
        hasSeenWelcome = localStorage.getItem(hasSeenWelcomeKey) === 'true';
    } catch (e) {
        console.warn("Could not access localStorage. Premium welcome message may show again.");
    }

    if (isPremium && !hasSeenWelcome) {
      setIsOpen(true);
      try {
        localStorage.setItem(hasSeenWelcomeKey, 'true');
      } catch (e) {
         console.warn("Could not write to localStorage.");
      }
    }
  }, [userData]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center items-center">
            <div className="p-4 rounded-full bg-yellow-400/20 mb-4">
                 <Crown className="h-12 w-12 text-yellow-500" />
            </div>
          <DialogTitle className="text-2xl font-bold">Premium'a Hoş Geldin!</DialogTitle>
          <DialogDescription>
            Aramıza katıldığın için teşekkürler. İşte seni bekleyen özel avantajlar:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            {userData?.isFirstPremium && (
                <div className="flex items-start gap-4 p-3 bg-green-500/10 rounded-lg">
                    <Gift className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold">İlk Üyelik Hediyen!</h4>
                        <p className="text-sm text-muted-foreground">100 Elmas ve 3 gün sınırsız oda kurma hakkı hesabına eklendi!</p>
                    </div>
                </div>
            )}
            <div className="flex items-start gap-4 p-3">
                <Sparkles className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold">Özel Görünüm</h4>
                    <p className="text-sm text-muted-foreground">Profilinde ve sohbetlerde kırmızı premium tacı, çerçeve ve baloncuk efektleri.</p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-3">
                <Sparkles className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold">Ücretsiz Oda Geliştirmeleri</h4>
                    <p className="text-sm text-muted-foreground">Oda katılımcı limitini elmas harcamadan, ücretsiz olarak artır.</p>
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => setIsOpen(false)}>Harika, Başlayalım!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
- yeniyedek/src/components/common/PwaInstallButton.tsx:
```tsx
// This file is obsolete and has been moved to clean up the project.
export default function PwaInstallButton() {
  return null;
}
```
- yeniyedek/src/components/layout/ExploreMenu.tsx:
```tsx
// This file is obsolete and has been removed to clean up the project.
export default function ExploreMenu() {
  return null;
}
```
- yeniyedek/src/components/voice/ActiveDmCallBar.tsx:
```tsx
// This component has been disabled from the UI.
export default function ActiveDmCallBar() {
    return null;
}
```
- yeniyedek/src/components/voice/RoomFooter.tsx:
```tsx
// This file is obsolete and has been removed to clean up the project.
export default function RoomFooter() {
    return null;
}
```
- yeniyedek/src/hooks/useNetworkStatus.ts:
```ts
// Bu custom hook, kullanıcının internet bağlantısının
// durumunu (çevrimiçi/çevrimdışı) takip eder.
'use client';
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  // `navigator.onLine`'dan gelen ilk değeri alarak state'i başlat.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sunucu tarafında `window` nesnesi olmadığı için, ilk kontrolü istemcide yap.
    const getInitialStatus = () => typeof window.navigator.onLine === 'undefined' ? true : window.navigator.onLine;

    setIsOnline(getInitialStatus());

    // Tarayıcının 'online' ve 'offline' olaylarını dinle.
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Bileşen DOM'dan kaldırıldığında (unmount) olay dinleyicilerini temizle.
    // Bu, hafıza sızıntılarını önler.
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```
- yeniyedek/src/lib/actions/callActions.ts:
```ts
// src/lib/actions/callActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { createNotification } from './notificationActions';
import { addCallSystemMessageToDm } from './dmActions';
import { getChatId } from '../utils';

interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
}

export async function initiateCall(caller: UserInfo, receiver: UserInfo, type: 'video' | 'audio') {
  const callsRef = collection(db, 'calls');
  const newCallRef = doc(callsRef);

  const initialVideoStatus = {
    [caller.uid]: type === 'video',
    [receiver.uid]: false,
  };

  await setDoc(newCallRef, {
    callerId: caller.uid,
    callerInfo: {
      username: caller.username,
      photoURL: caller.photoURL,
    },
    receiverId: receiver.uid,
    receiverInfo: {
      username: receiver.username,
      photoURL: receiver.photoURL,
    },
    participantUids: [caller.uid, receiver.uid],
    status: 'ringing',
    type: type,
    videoStatus: initialVideoStatus,
    createdAt: serverTimestamp(),
  });

  // DO NOT AWAIT THIS. Let it run in the background.
  // This allows the client to navigate to the call page immediately.
  createNotification({
    recipientId: receiver.uid,
    senderId: caller.uid,
    senderUsername: caller.username,
    senderAvatar: caller.photoURL,
    type: 'call_incoming',
    callId: newCallRef.id,
    callType: type,
  });

  return newCallRef.id;
}

export async function updateVideoStatus(callId: string, userId: string, isEnabled: boolean) {
  const callRef = doc(db, 'calls', callId);
  await updateDoc(callRef, {
    [`videoStatus.${userId}`]: isEnabled,
  });
}


export async function updateCallStatus(callId: string, status: 'declined' | 'ended' | 'missed' | 'active') {
    const callRef = doc(db, 'calls', callId);
    const updateData: { status: string; [key: string]: any } = { status };
    let shouldAddDmMessage = false;
    let duration: string | undefined;

    const callSnap = await getDoc(callRef);
    if (!callSnap.exists()) return;
    const callData = callSnap.data();
    
    if(status !== 'active') {
        updateData.endedAt = serverTimestamp();
        shouldAddDmMessage = true;
        if(status === 'ended' && callData.startedAt) {
            const startTime = (callData.startedAt as Timestamp).toMillis();
            const endTime = Date.now();
            const durationSeconds = Math.round((endTime - startTime) / 1000);
            const minutes = Math.floor(durationSeconds / 60);
            const seconds = durationSeconds % 60;
            duration = `${minutes} dakika ${seconds} saniye`;
            updateData.duration = duration;
        }
    } else {
        updateData.startedAt = serverTimestamp();
    }
    
    await updateDoc(callRef, updateData);

    if (shouldAddDmMessage) {
        const chatId = getChatId(callData.callerId, callData.receiverId);
        await addCallSystemMessageToDm(chatId, status, duration);
    }
    
    if (status === 'missed' && callData.callerId) {
         await createNotification({
            recipientId: callData.callerId,
            senderId: callData.receiverId,
            senderUsername: callData.receiverInfo.username,
            senderAvatar: callData.receiverInfo.photoURL,
            type: 'call_missed',
            callId: callId,
            callType: callData.type,
        });
    }
}

export async function sendOffer(callId: string, offer: RTCSessionDescriptionInit) {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { offer: offer });
}

export async function sendAnswer(callId: string, answer: RTCSessionDescriptionInit) {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { answer: answer, status: 'active', startedAt: serverTimestamp() });
}

export async function sendIceCandidate(callId: string, candidate: RTCIceCandidateInit, targetId: string) {
    const candidatesCol = collection(db, 'calls', callId, `${targetId}Candidates`);
    await addDoc(candidatesCol, { ...candidate });
}

```
- yeniyedek/src/lib/actions/chatActions.ts:
```ts
// This file is obsolete and has been removed to clean up the project.
// The room chat logic has been moved to `src/lib/actions/roomActions.ts`.

```
- yeniyedek/src/lib/actions/gameActions.ts:
```ts
// This file is obsolete and has been removed to clean up the project.
// The quiz game logic has been moved to the new `gameActions.ts` and `roomActions.ts`.
// The interactive game logic is now in `mindWarActions.ts`.

```
- yeniyedek/src/lib/actions/giveawayActions.ts:
```ts
// src/lib/actions/giveawayActions.ts
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, arrayUnion, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Room, UserProfile, Giveaway } from '../types';
import { addSystemMessage } from './roomActions';

export async function startGiveaway(roomId: string, hostId: string, prize: string) {
    if (!roomId || !hostId || !prize) throw new Error("Gerekli bilgiler eksik.");

    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        const roomData = roomDoc.data() as Room;

        if (roomData.createdBy.uid !== hostId) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }
        if (roomData.giveaway && roomData.giveaway.status === 'active') {
            throw new Error("Zaten aktif bir çekiliş var.");
        }

        const newGiveaway: Giveaway = {
            status: 'active',
            prize,
            participants: [],
            startedAt: serverTimestamp() as any,
        };

        transaction.update(roomRef, { giveaway: newGiveaway });
    });
    
    await addSystemMessage(roomId, `🎁 Yeni bir çekiliş başladı! Ödül: ${prize}`);

    return { success: true };
}

export async function joinGiveaway(roomId: string, userId: string, userInfo: { username: string, photoURL: string | null }) {
    if (!roomId || !userId) throw new Error("Gerekli bilgiler eksik.");

    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
        'giveaway.participants': arrayUnion({ uid: userId, ...userInfo })
    });

    return { success: true };
}

export async function drawGiveawayWinner(roomId: string, hostId: string) {
    if (!roomId || !hostId) throw new Error("Gerekli bilgiler eksik.");

    const roomRef = doc(db, 'rooms', roomId);

    return await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        const roomData = roomDoc.data() as Room;

        if (roomData.createdBy.uid !== hostId) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }
        const giveaway = roomData.giveaway;
        if (!giveaway || giveaway.status !== 'active' || giveaway.participants.length === 0) {
            throw new Error("Çekiliş başlatılamadı veya hiç katılımcı yok.");
        }

        const winner = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
        
        transaction.update(roomRef, {
            'giveaway.status': 'finished',
            'giveaway.winner': winner,
            'giveaway.endedAt': serverTimestamp(),
        });

        // Here you would add logic to actually award the prize, e.g., update user diamonds.
        // For now, we'll just announce the winner.
        await addSystemMessage(roomId, `🎉 Çekilişin kazananı: @${winner.username}! Ödülü (${giveaway.prize}) kazandı.`);

        return { success: true, winner };
    });
}

export async function cancelGiveaway(roomId: string, hostId: string) {
    if (!roomId || !hostId) throw new Error("Gerekli bilgiler eksik.");

    const roomRef = doc(db, 'rooms', roomId);
    
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        const roomData = roomDoc.data() as Room;

        if (roomData.createdBy.uid !== hostId) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }

        transaction.update(roomRef, {
             'giveaway.status': 'idle',
             'giveaway.prize': '',
             'giveaway.participants': [],
             'giveaway.winner': null
        });
    });

    await addSystemMessage(roomId, 'Çekiliş oda sahibi tarafından iptal edildi.');
    return { success: true };
}

```
- yeniyedek/src/lib/actions/healthActions.ts:
```ts
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export interface HealthCheckResult {
  service: string;
  status: 'ok' | 'error';
  details: string;
}

export async function checkSystemHealth(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Firestore Check
  try {
    const healthCheckDoc = doc(db, 'config', 'healthCheck');
    await setDoc(healthCheckDoc, { timestamp: new Date().toISOString() });
    const docSnap = await getDoc(healthCheckDoc);
    if (!docSnap.exists()) {
      throw new Error("Test document could not be read back.");
    }
    await deleteDoc(healthCheckDoc);
    results.push({ service: 'Firestore', status: 'ok', details: 'Read/Write test successful.' });
  } catch (error: any) {
    results.push({ service: 'Firestore', status: 'error', details: error.message });
  }

  // Add other checks here in the future if needed (e.g., calling a Genkit flow)

  return results;
}

```
- yeniyedek/src/lib/actions/imageActions.ts:
```ts
'use server';

import { styleImage, type StyleImageInput } from '@/ai/flows/imageStyleFlow';

/**
 * Bir resme yapay zeka ile sanatsal bir filtre uygular.
 * Bu fonksiyon, Genkit akışını çağıran bir sarmalayıcıdır.
 * @param input - Resim verisi ve uygulanacak stili içeren nesne.
 * @returns Stil uygulanmış resmin data URI'sini içeren nesne.
 */
export async function applyImageFilter(input: StyleImageInput) {
    try {
        const result = await styleImage(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Resim filtresi uygulanırken hata oluştu:", error);
        // Hatanın gerçek mesajını istemciye gönder, böylece daha net bilgi alınır.
        return { success: false, error: error.message || "Bilinmeyen bir AI hatası oluştu." };
    }
}

```
- yeniyedek/src/lib/actions/liveActions.ts:
```ts
'use server';
import { db } from '@/lib/firebase';
import { doc, collection, addDoc, serverTimestamp, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

interface HostInfo {
  uid: string;
  username: string;
  photoURL: string | null;
}

export async function startLiveStream(host: HostInfo, title: string) {
  if (!host || !host.uid) throw new Error("Host information is required.");
  if (!title.trim()) throw new Error("A title is required to start a live stream.");

  const livesRef = collection(db, 'lives');
  const newLiveDoc = await addDoc(livesRef, {
    hostId: host.uid,
    hostUsername: host.username,
    hostPhotoURL: host.photoURL,
    title,
    status: 'live',
    viewerCount: 0,
    createdAt: serverTimestamp(),
  });

  revalidatePath('/live');
  return { success: true, liveId: newLiveDoc.id };
}

export async function endLiveStream(liveId: string, hostId: string) {
  if (!liveId || !hostId) throw new Error("Live ID and Host ID are required.");

  const liveRef = doc(db, 'lives', liveId);
  const liveDoc = await getDoc(liveRef);

  if (!liveDoc.exists() || liveDoc.data().hostId !== hostId) {
    throw new Error("Live stream not found or you do not have permission to end it.");
  }

  await updateDoc(liveRef, {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
  
  // In a real scenario, you'd also cleanup the streaming server resources here.
  
  revalidatePath('/live');
  revalidatePath(`/live/${liveId}`);
  return { success: true };
}

```
- yeniyedek/src/lib/actions/mindWarActions.ts:
```ts
// src/lib/actions/mindWarActions.ts
'use server';

// Bu dosya, "Zihin Savaşları" oyununun sunucu taraflı mantığını yönetir.
// Firestore işlemleri ve yapay zeka akışlarının çağrılması burada yapılır.

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import type { MindWarSession, Room } from '../types';
import { initializeMindWar, processMindWarTurn } from '@/ai/flows/mindWarGameFlow';
import { revalidatePath } from 'next/cache';

// Oyunu başlatan sunucu eylemi
export async function startMindWar(args: {
  roomId: string;
  hostId: string;
  playerUids: string[];
  theme: string;
}) {
  const { roomId, hostId, playerUids, theme } = args;
  if (!roomId || !hostId || playerUids.length < 2 || !theme) {
    throw new Error('Geçersiz oyun başlatma bilgileri.');
  }

  const roomRef = doc(db, 'rooms', roomId);
  const mindWarSessionsRef = collection(roomRef, 'mindWarSessions');
  const newSessionRef = doc(mindWarSessionsRef);

  // Firestore transaction'ı başlatarak veri tutarlılığını sağla
  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists()) throw new Error('Oda bulunamadı.');

    const roomData = roomDoc.data() as Room;
    if (roomData.activeMindWarSessionId) throw new Error('Bu odada zaten aktif bir oyun var.');

    // Oyuncu bilgilerini Firestore'dan çek
    const playerPromises = playerUids.map(uid => getDoc(doc(db, 'users', uid)));
    const playerDocs = await Promise.all(playerPromises);
    const playersInfo = playerDocs.map(doc => {
        if (!doc.exists()) throw new Error(`Oyuncu bulunamadı: ${doc.id}`);
        const data = doc.data();
        return { uid: data.uid, username: data.username, photoURL: data.photoURL || null };
    });

    // Yapay zeka akışını çağırarak oyunun başlangıç durumunu oluştur
    const initialState = await initializeMindWar({
      players: playersInfo,
      theme: theme,
    });
    
    // Oluşturulan başlangıç durumunu Firestore'a yaz
    transaction.set(newSessionRef, { ...initialState, createdAt: serverTimestamp() });

    // Odanın aktif oyun ID'sini güncelle
    transaction.update(roomRef, { activeMindWarSessionId: newSessionRef.id });
  });

  // İlgili oda sayfasının verilerini yeniden doğrula (önbelleği temizle)
  revalidatePath(`/rooms/${roomId}`);
  
  return { success: true, sessionId: newSessionRef.id };
}

// Oyuncunun hamlesini işleyen sunucu eylemi
export async function makeMindWarMove(args: {
  roomId: string;
  sessionId: string;
  playerId: string;
  choice: { key: string; text: string };
}) {
  const { roomId, sessionId, playerId, choice } = args;
  const sessionRef = doc(db, 'rooms', roomId, 'mindWarSessions', sessionId);

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists()) throw new Error('Oyun oturumu bulunamadı.');

    const currentSession = sessionDoc.data() as MindWarSession;
    if (currentSession.status !== 'ongoing') throw new Error('Oyun aktif değil.');
    if (currentSession.currentTurn.activePlayerUid !== playerId) throw new Error('Sıra sizde değil.');

    // Yapay zeka akışını çağırarak yeni tur durumunu al
    const nextState = await processMindWarTurn({
      currentState: currentSession,
      playerMove: {
        playerId,
        choiceKey: choice.key,
        choiceText: choice.text,
      },
    });

    // Firestore'da oyun durumunu güncelle
    transaction.update(sessionRef, nextState);
  });

  // İlgili oda sayfasının verilerini yeniden doğrula
  revalidatePath(`/rooms/${roomId}`);

  return { success: true };
}

```
- yeniyedek/src/lib/actions/moderationActions.ts:
```ts
'use server';

import { moderateImage, type ModerateImageInput, type ModerateImageOutput } from '@/ai/flows/moderateImageFlow';

/**
 * Bir görüntünün güvenli olup olmadığını kontrol eder.
 * @param input Resim verisini içeren nesne.
 * @returns Başarı durumu ve denetim sonucunu içeren nesne.
 */
export async function checkImageSafety(input: ModerateImageInput): Promise<{ success: boolean; data?: ModerateImageOutput, error?: string }> {
    try {
        const result = await moderateImage(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Resim denetimi sırasında hata oluştu:", error);
        return { success: false, error: error.message || "Resim denetlenemedi. Lütfen tekrar deneyin." };
    }
}

```
- yeniyedek/src/lib/firestoreUtils.ts:
```ts
/**
 * @fileOverview Firestore ile ilgili genel yardımcı fonksiyonları içerir.
 * Özellikle toplu silme işlemleri için kullanılır.
 */
'use server';

import { doc, deleteDoc, collection, getDocs, writeBatch, limit, query } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, listAll, deleteObject } from 'firebase/storage';

/**
 * Belirtilen bir klasördeki tüm dosyaları (alt klasörler dahil) Firebase Storage'dan siler.
 * @param folderPath Silinecek klasörün yolu (örn: 'upload/rooms/roomId123').
 */
async function deleteStorageFolder(folderPath: string) {
    const folderRef = ref(storage, folderPath);
    try {
        const res = await listAll(folderRef);
        
        // Mevcut klasördeki tüm dosyaları sil.
        const deleteFilePromises = res.items.map((itemRef) => deleteObject(itemRef));
        await Promise.all(deleteFilePromises);

        // Tüm alt klasörleri özyineli (recursive) olarak sil.
        const deleteFolderPromises = res.prefixes.map((subfolderRef) => deleteStorageFolder(subfolderRef.fullPath));
        await Promise.all(deleteFolderPromises);

    } catch (error: any) {
        // Eğer klasör zaten yoksa hata verme, bu beklenen bir durum olabilir.
        if (error.code === 'storage/object-not-found') {
            return;
        }
        console.error(`Klasör silinirken hata oluştu: ${folderPath}:`, error);
        // Firestore silme işleminin devam etmesi için hatayı yeniden fırlatmıyoruz.
    }
}


/**
 * Bir koleksiyonu toplu (batch) olarak silerek bellek aşımlarını ve
 * performans sorunlarını önler. Firestore'un tek seferde silebileceği
 * doküman sayısı limitlidir, bu fonksiyon bu limiti aşar.
 * @param collectionRef Silinecek koleksiyonun referansı.
 * @param batchSize Her bir toplu işlemde silinecek doküman sayısı.
 */
async function deleteCollection(collectionRef: any, batchSize: number) {
    const q = query(collectionRef, limit(batchSize));
    const snapshot = await getDocs(q);

    // Koleksiyon boşsa işlemi bitir.
    if (snapshot.size === 0) {
        return;
    }

    // Toplu yazma işlemi başlat.
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Eğer silinecek daha fazla doküman varsa, fonksiyonu tekrar çağır.
    if (snapshot.size >= batchSize) {
        await deleteCollection(collectionRef, batchSize);
    }
}

/**
 * Bir oda dokümanını, tüm alt koleksiyonlarını (mesajlar, katılımcılar vb.)
 * ve o odayla ilişkili tüm dosyaları Firebase Storage'dan tamamen siler.
 * @param roomId Silinecek odanın ID'si.
 */
export async function deleteRoomWithSubcollections(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);

    // Firestore alt koleksiyonlarını sil.
    const subcollections = ['messages', 'voiceParticipants', 'signals', 'games', 'game_sessions', 'playlist'];
    for (const sub of subcollections) {
        await deleteCollection(collection(roomRef, sub), 50);
    }

    // Storage'daki ilgili dosyaları sil.
    await deleteStorageFolder(`upload/rooms/${roomId}`);
    await deleteStorageFolder(`music/${roomId}`);


    // Ana oda dokümanını sil.
    await deleteDoc(roomRef);
}

/**
 * Bir sohbet dokümanını, tüm alt koleksiyonlarını (mesajlar)
 * ve o sohbetle ilişkili tüm dosyaları Firebase Storage'dan tamamen siler.
 * @param chatId Silinecek sohbetin ID'si.
 */
export async function deleteChatWithSubcollections(chatId: string) {
    const metadataRef = doc(db, 'directMessagesMetadata', chatId);
    const messagesCollectionRef = collection(db, 'directMessages', chatId, 'messages');

    // Firestore subcollections
    await deleteCollection(messagesCollectionRef, 50);

    // Storage folder (e.g., for images, audio)
    await deleteStorageFolder(`dms/${chatId}`);

    // Main metadata document
    await deleteDoc(metadataRef);
}

```
- yeniyedek/src/lib/workbox.ts:
```ts
'use client';
import { Workbox } from 'workbox-window';

let wb: Workbox | undefined;

export const registerServiceWorker = () => {
    if (process.env.NODE_ENV === 'development') {
        return;
    }
  
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
        wb = new Workbox('/sw.js');
        
        wb.addEventListener('waiting', (event) => {
            // An an 'update' is available, we can ask it to take control immediately.
            console.log('A new service worker is waiting to be activated.');
            wb?.messageSkipWaiting();
        });

        wb.addEventListener('activated', (event) => {
            // This event is fired when the new service worker has taken control.
            // It's a good time to reload the page to use the new assets.
            if (event.isUpdate) {
                console.log('Service worker has been updated. Reloading page...');
                window.location.reload();
            } else {
                console.log('Service worker activated for the first time!');
            }
        });

        wb.register();
    }
};

```
- yeniyedek/src/sw.ts:
```ts
// Bu dosya, yeni özel servis çalışanı (`public/sw.js`) yapısıyla gereksiz hale gelmiştir.
// Çakışmaları önlemek için içeriği temizlenmiştir ve güvenle silinebilir.

```
- yeniyedek/src/types.ts:
```ts
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
  outcome: string; // Seçim sonucunda ne olduğu
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
  winner?: string | null; // Kazanan oyuncu veya takım
  endSummary?: { // Oyun sonu özeti
    narrative: string;
    scores: {
      [uid: string]: {
        intelligence: number;
        trust: number;
        courage: number;
        reward: number;
      };
    };
    winner?: string | null;
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
    photoURL?: string | null;
    bio?: string;
    postCount?: number;
    role: 'admin' | 'user';
    gender?: 'male' | 'female';
    age?: number;
    city?: string;
    country?: string;
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
    senderAvatar: string | null;
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
    userAvatar?: string | null;
    userAvatarFrame?: string;
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
        photoURL?: string | null;
        role?: 'admin' | 'user';
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

export interface QuizQuestion {
    question: string;
    options: string[];
    correctOptionIndex: number;
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

    