// src/app/(main)/matchmaking/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { enterMatchmakingQueue, leaveMatchmakingQueue } from '@/lib/actions/matchmakingActions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Swords, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';

type MatchmakingStatus = 'idle' | 'searching' | 'matched';

export default function MatchmakingPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Listen for match result from Firestore real-time updates
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
        const data = docSnap.data();
        if (data?.matchRoomId) {
            setStatus('matched');
            toast({ title: "Eşleşme Bulundu!", description: "Odaya yönlendiriliyorsunuz..." });
            
            // Navigate and then clear the field
            router.push(`/rooms/${data.matchRoomId}`);
            await updateDoc(doc(db, 'users', user.uid), { matchRoomId: null });
        }
        // Update local status based on DB, useful on re-renders
        if (status !== data?.matchmakingStatus) {
            setStatus(data?.matchmakingStatus || 'idle');
        }
    });

    return () => unsub();
  }, [user, router, toast, status]);

  const handleStartSearch = useCallback(async () => {
    if (!user || !userData?.gender) {
        toast({ variant: 'destructive', description: "Eşleşme için profil bilgileriniz (cinsiyet) eksik." });
        return;
    }
    setStatus('searching');
    setError(null);
    try {
        const result = await enterMatchmakingQueue(user.uid, userData.gender);
        if (result.status === 'error') {
            throw new Error(result.message);
        }
    } catch (e: any) {
        setStatus('idle');
        setError(e.message || "Arama başlatılamadı.");
        toast({ variant: 'destructive', title: "Hata", description: e.message });
    }
  }, [user, userData, toast]);

  const handleCancelSearch = useCallback(async () => {
    if (!user) return;
    try {
        await leaveMatchmakingQueue(user.uid);
        setStatus('idle');
        setError(null);
        toast({ description: "Arama iptal edildi." });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Hata", description: "Arama iptal edilemedi." });
    }
  }, [user, toast]);

  const renderContent = () => {
    switch (status) {
      case 'searching':
        return (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center flex flex-col items-center gap-6"
          >
            <div className="relative flex items-center justify-center">
                <Loader2 className="h-24 w-24 text-primary animate-spin-slow" />
                <Swords className="absolute h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Rakip Aranıyor...</h2>
            <p className="text-muted-foreground">Lütfen bekleyin, sizin için en uygun kişi bulunuyor.</p>
            <Button variant="outline" size="lg" className="rounded-full" onClick={handleCancelSearch}>
              Aramayı İptal Et
            </Button>
          </motion.div>
        );
      case 'idle':
      default:
        return (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <CardHeader>
              <Swords className="h-16 w-16 mx-auto text-primary" />
              <CardTitle className="text-3xl mt-4">Hızlı Eşleşme</CardTitle>
              <CardDescription>
                Rastgele bir kullanıcıyla tanış ve 1 saatlik özel bir odada sohbete başla!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="rounded-full px-12 py-7 text-lg shadow-lg shadow-primary/30" onClick={handleStartSearch}>
                Aramayı Başlat
              </Button>
               {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            </CardContent>
          </motion.div>
        );
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 bg-transparent">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </Card>
    </div>
  );
}
