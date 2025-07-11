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
import type { MatchmakingChat } from '@/lib/types';
import Link from 'next/link';

export default function MatchmakingPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'searching' | 'found'>('idle');

  const handleStartSearch = async () => {
    if (!user || !userData) return;
    setStatus('searching');
    try {
      await findMatch(user.uid, {
        gender: userData.gender || 'male', // default for safety
        username: userData.username,
        photoURL: userData.photoURL,
        age: userData.age,
        city: userData.city,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
      setStatus('idle');
    }
  };
  
  const handleCancelSearch = async () => {
    if (!user) return;
    setStatus('idle');
    try {
      await cancelMatchmaking(user.uid);
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message });
    }
  };

  useEffect(() => {
    if (status !== 'searching' || !user) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        const data = doc.data();
        if (data?.activeMatchmakingChatId) {
            setStatus('found');
            router.replace(`/matchmaking/chat/${data.activeMatchmakingChatId}`);
        }
    });

    return () => unsub();
  }, [status, user, router]);


  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
  if (!userData?.gender || !userData.age || !userData.city) {
    return (
        <div className="flex h-full flex-col items-center justify-center text-center p-4">
             <Card className="w-full max-w-md">
                <CardHeader>
                     <UserX className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle>Profil Bilgileri Eksik</CardTitle>
                    <CardDescription>
                        Otomatik eşleşme sistemini kullanabilmek için profilinizde **cinsiyet, yaş ve şehir** bilgilerinizin kayıtlı olması gerekmektedir.
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
              Butona tıkla ve 4 dakikalık sürpriz bir sohbete başla. Süre sonunda eşinle birbirinizi beğenirseniz, kalıcı sohbete geçersiniz!
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
