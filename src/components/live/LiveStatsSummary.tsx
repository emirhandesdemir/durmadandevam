// src/components/live/LiveStatsSummary.tsx
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Users, Clock, Gem, Home } from 'lucide-react';
import type { LiveSession } from '@/lib/types';
import Link from 'next/link';

interface LiveStatsSummaryProps {
  stats: Partial<LiveSession>;
}

const formatDuration = (totalSeconds = 0) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} dakika ${seconds} saniye`;
}

export default function LiveStatsSummary({ stats }: LiveStatsSummaryProps) {
  return (
    <div className="flex items-center justify-center min-h-full bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center items-center">
            <Award className="h-12 w-12 text-primary"/>
          <CardTitle>Yayın Sona Erdi!</CardTitle>
          <CardDescription>Harika bir yayındı! İşte özetin:</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-center">
           <div className="p-4 bg-muted rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground"/>
                <p className="text-2xl font-bold">{formatDuration(stats.durationSeconds)}</p>
                <p className="text-xs text-muted-foreground">Yayın Süresi</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground"/>
                <p className="text-2xl font-bold">{stats.peakViewerCount || 0}</p>
                <p className="text-xs text-muted-foreground">En Yüksek İzleyici</p>
            </div>
             <div className="p-4 bg-muted rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground"/>
                <p className="text-2xl font-bold">{stats.viewers?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Toplam İzleyici</p>
            </div>
             <div className="p-4 bg-muted rounded-lg">
                <Gem className="h-6 w-6 mx-auto mb-2 text-muted-foreground"/>
                <p className="text-2xl font-bold">{stats.totalGiftValue || 0}</p>
                <p className="text-xs text-muted-foreground">Kazanılan Hediye Değeri</p>
            </div>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
                <Link href="/home">
                    <Home className="mr-2 h-4 w-4"/> Ana Sayfaya Dön
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}