// src/app/(main)/matchmaking/reveal/[chatId]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MatchmakingChat, UserProfile } from '@/lib/types';
import { Loader2, Heart, X, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { submitMatchReaction } from '@/lib/actions/matchmakingActions';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getChatId } from '@/lib/utils';

function PartnerLeftCard() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace('/matchmaking');
        }, 4000);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle>Partnerin Sohbetten Ayrıldı</CardTitle>
                <CardDescription>4 saniye içinde yeni bir eşleşme için yönlendirileceksin.</CardDescription>
            </CardHeader>
            <CardContent>
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary"/>
            </CardContent>
        </Card>
    )
}

function MatchSuccessCard({ partner }: { partner: UserProfile & { permChatId: string } }) {
    return (
        <Card className="w-full max-w-md text-center bg-green-500/10 border-green-500/30">
            <CardHeader>
                <CardTitle className="text-green-600">Eşleştiniz!</CardTitle>
                <CardDescription>Artık {partner.username} ile kalıcı olarak sohbet edebilir ve birbirinizi takip edebilirsiniz.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                 <Avatar className="h-24 w-24 border-4 border-green-400">
                    <AvatarImage src={partner.photoURL || undefined} />
                    <AvatarFallback>{partner.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Button asChild>
                    <Link href={`/dm/${partner.permChatId}`}>
                        <MessageCircle className="mr-2 h-4 w-4"/> Mesaj Gönder
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function NoMatchCard() {
     return (
        <Card className="w-full max-w-md text-center bg-destructive/10 border-destructive/30">
            <CardHeader>
                <CardTitle className="text-destructive">Eşleşme Olmadı</CardTitle>
                <CardDescription>Üzülme, her gün yeni bir şans! Yeni bir sohbet için tekrar dene.</CardDescription>
            </CardHeader>
             <CardContent>
                <Button asChild>
                    <Link href="/matchmaking">
                        Yeni Eşleşme Ara
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}


export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const chatId = params.chatId as string;
  const { toast } = useToast();

  const [chat, setChat] = useState<MatchmakingChat | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReacting, setIsReacting] = useState(false);

  useEffect(() => {
    if (!user || !chatId) return;

    const chatDocRef = doc(db, 'matchmakingChats', chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const chatData = { id: docSnap.id, ...docSnap.data() } as MatchmakingChat;
        setChat(chatData);

        const partnerId = Object.keys(chatData.participants).find(uid => uid !== user.uid);
        if (partnerId) {
            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
            if(partnerDoc.exists()) {
                setPartner(partnerDoc.data() as UserProfile);
            }
        }
      } else {
        router.replace('/matchmaking');
      }
      setLoading(false);
    });

    return () => unsubscribeChat();
  }, [chatId, user, router]);
  
  const handleReaction = async (reaction: 'like' | 'pass') => {
      if (!user || !chat) return;
      setIsReacting(true);
      try {
          await submitMatchReaction(chat.id, user.uid, reaction);
      } catch (error: any) {
          toast({ variant: 'destructive', description: error.message });
          setIsReacting(false);
      }
  }
  
  if (loading || !chat || !partner || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  // Determine what to show
  const myReaction = chat.reactions?.[user.uid];
  const partnerReaction = chat.reactions?.[partner.uid];
  const isMatch = myReaction === 'like' && partnerReaction === 'like';
  const isEnded = (myReaction && partnerReaction) || chat.status === 'ended' || chat.status === 'abandoned';
  
  if (chat.status === 'abandoned') {
      return <div className="flex h-full items-center justify-center p-4"><PartnerLeftCard /></div>;
  }
  if (isEnded) {
      const permChatId = getChatId(user.uid, partner.uid);
      return (
        <div className="flex h-full items-center justify-center p-4">
            {isMatch ? <MatchSuccessCard partner={{...partner, permChatId}} /> : <NoMatchCard />}
        </div>
      )
  }

  // Main reveal UI
  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sohbet Bitti!</CardTitle>
          <CardDescription>
            {partner.username} ile sohbetiniz nasıldı? Tekrar konuşmak ister misin?
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="h-28 w-28 border-4 border-muted">
                <AvatarImage src={partner.photoURL || undefined} />
                <AvatarFallback>{partner.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold">{partner.username}</h3>
            {myReaction ? (
                <div className="text-center p-4 space-y-2">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground"/>
                    <p className="text-muted-foreground">Diğer kullanıcının kararı bekleniyor...</p>
                </div>
            ) : (
                <div className="flex w-full gap-4 pt-4">
                    <Button onClick={() => handleReaction('like')} variant="default" size="lg" className="flex-1 bg-green-600 hover:bg-green-700 h-16" disabled={isReacting}>
                        <Heart className="mr-2 h-6 w-6"/> Beğen
                    </Button>
                    <Button onClick={() => handleReaction('pass')} variant="destructive" size="lg" className="flex-1 h-16" disabled={isReacting}>
                        <X className="mr-2 h-6 w-6"/> Geç
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
