// src/app/(main)/matchmaking/chat/[chatId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, getDoc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MatchmakingChat, UserProfile, Room, Message } from '@/lib/types';
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
import { cn } from '@/lib/utils';

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
  const partnerId = chat.participantUids.find(uid => uid !== user.uid)!;
  const partnerReaction = chat.reactions?.[partnerId];
  
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
        <TextChat messages={messages as Message[]} loading={false} room={chat as unknown as Room} />
      </main>
      
      <footer className="p-2 border-t">
        <p className="text-xs text-center text-muted-foreground">Bu geçici bir sohbettir. Kalıcı olmak için ikiniz de kalbe dokunun!</p>
      </footer>
    </div>
  );
}
