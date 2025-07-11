// src/app/(main)/matchmaking/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { findMatch, cancelMatchmaking } from '@/lib/actions/matchmakingActions';
import { Loader2, Swords, UserX, UserSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function MatchmakingPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'searching' | 'found'>('idle');

  // Eşleştirme aramasını başlatan fonksiyon
  const handleStartSearch = async () => {
    if (!user || !userData) return;
    setStatus('searching');
    try {
      const result = await findMatch(user.uid, {
        gender: userData.gender || 'male',
        username: userData.username,
        photoURL: userData.photoURL,
        age: userData.age,
        city: userData.city,
        interests: userData.interests,
      });
      
      if (result.status === 'matched' && result.chatId) {
        // Anında bir eşleşme bulundu, sohbet odasına yönlendir.
        router.push(`/matchmaking/chat/${result.chatId}`);
      } else if (result.status === 'searching') {
        // Hemen bir eşleşme bulunamadı, kullanıcıya bilgi ver ve arka planda beklemeye devam et.
        toast({ description: "Eşleşme aranıyor, lütfen bekleyin..." });
      } else if (result.status === 'already_in_chat' && result.chatId) {
        // Kullanıcı zaten bir odada, oraya yönlendir.
        router.push(`/matchmaking/chat/${result.chatId}`);
      }

    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
      setStatus('idle');
    }
  };
  
  // Eşleşme aramasını iptal etme
  const handleCancelSearch = async () => {
    if (!user) return;
    setStatus('idle');
    try {
      await cancelMatchmaking(user.uid);
      toast({ description: "Eşleşme araması iptal edildi." });
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message });
    }
  };

  // Arka planda eşleşme bulunduğunda yönlendirme yapmak için dinleyici
  useEffect(() => {
    if (status !== 'searching' || !user) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        const data = doc.data();
        if (data?.activeMatchmakingChatId) {
            setStatus('found');
            router.push(`/matchmaking/chat/${data.activeMatchmakingChatId}`);
        }
    });

    return () => unsub();
  }, [status, user, router]);


  // Auth verisi yüklenirken yükleme ekranı
  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
  // Eşleştirme için gerekli profil bilgileri eksikse uyarı göster
  if (!userData?.gender || !userData.age || !userData.city || !userData.interests || userData.interests.length === 0) {
    return (
        <div className="flex h-full flex-col items-center justify-center text-center p-4">
             <Card className="w-full max-w-md">
                <CardHeader>
                     <UserX className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle>Profil Bilgileri Eksik</CardTitle>
                    <CardDescription>
                        Otomatik eşleşme sistemini kullanabilmek için profilinizde **cinsiyet, yaş, şehir ve ilgi alanları** bilgilerinizin eksiksiz olması gerekmektedir.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/profile">Profil Ayarlarına Git</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center text-center p-4">
      <div className="flex items-center gap-4 text-primary mb-6">
        <Swords className="h-12 w-12" />
        <h1 className="text-4xl font-bold">Hızlı Sohbet</h1>
      </div>

      {status === 'searching' ? (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Eşleşme Aranıyor...</CardTitle>
            <CardDescription>Sana en uygun kişi bulunuyor, lütfen bekle.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <Button variant="destructive" onClick={handleCancelSearch}>İptal Et</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Yeni Bir Maceraya Hazır mısın?</CardTitle>
            <CardDescription>
              Butona tıkla ve 5 dakikalık sürpriz bir sohbete başla. Süre sonunda eşinle birbirinizi beğenirseniz, kalıcı sohbete geçersiniz!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="w-full" onClick={handleStartSearch}>
              <UserSearch className="mr-2 h-5 w-5" />
              Eşleşme Ara
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    