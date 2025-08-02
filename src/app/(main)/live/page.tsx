// src/app/(main)/live/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LiveSession } from '@/lib/types';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Radio, Users, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveStreamsPage() {
  const [liveStreams, setLiveStreams] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'lives'),
      where('status', '==', 'live'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const streams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveSession));
      // Sort by viewer count on the client side
      streams.sort((a, b) => (b.viewerCount || 0) - (a.viewerCount || 0));
      setLiveStreams(streams);
      setLoading(false);
    }, (error) => {
        console.error("Canlı yayınlar getirilirken hata:", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Canlı Yayınlar</h1>
        <Button asChild>
            <Link href="/live/start">
                <PlusCircle className="mr-2 h-4 w-4"/>
                Yayın Başlat
            </Link>
        </Button>
      </div>
      {liveStreams.length === 0 ? (
        <p className="text-center text-muted-foreground">Şu anda aktif canlı yayın bulunmuyor.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveStreams.map((stream) => (
            <Link key={stream.id} href={`/live/${stream.id}`}>
              <Card className="group relative aspect-[9/16] overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <CardContent className="absolute bottom-0 left-0 p-4 text-white w-full">
                  <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8 border-2 border-white">
                        <AvatarImage src={stream.hostPhotoURL || undefined} />
                        <AvatarFallback>{stream.hostUsername.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <p className="font-semibold text-sm truncate">{stream.hostUsername}</p>
                  </div>
                  <p className="text-sm line-clamp-2">{stream.title}</p>
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold bg-destructive px-2 py-1 rounded-md">
                            <Radio className="h-3 w-3" />
                            CANLI
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Users className="h-3 w-3" />
                            {stream.viewerCount}
                        </div>
                    </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
