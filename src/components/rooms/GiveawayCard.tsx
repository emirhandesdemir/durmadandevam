'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Loader2, PartyPopper, Users, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { joinGiveaway, drawGiveawayWinner, cancelGiveaway } from '@/lib/actions/giveawayActions';
import type { Giveaway } from '@/lib/types';

interface GiveawayCardProps {
  giveaway: Giveaway;
  roomId: string;
  isHost: boolean;
}

export default function GiveawayCard({ giveaway, roomId, isHost }: GiveawayCardProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasJoined = user ? giveaway.participants.some(p => p.uid === user.uid) : false;
  const participantCount = giveaway.participants.length;

  const handleJoin = async () => {
    if (!user || !userData) return;
    setIsJoining(true);
    try {
      await joinGiveaway(roomId, user.uid, { username: userData.username, photoURL: userData.photoURL || null });
      toast({ description: "Çekilişe başarıyla katıldın!" });
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  const handleDrawWinner = async () => {
    if (!user || !isHost) return;
    setIsProcessing(true);
    try {
      await drawGiveawayWinner(roomId, user.uid);
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCancel = async () => {
      if (!user || !isHost) return;
      setIsProcessing(true);
      try {
          await cancelGiveaway(roomId, user.uid);
          toast({ description: "Çekiliş iptal edildi."})
      } catch (error: any) {
           toast({ variant: 'destructive', description: error.message });
      } finally {
          setIsProcessing(false);
      }
  }

  if (giveaway.status === 'finished' && giveaway.winner) {
    return (
      <Card className="border-yellow-400 bg-yellow-400/10">
        <CardContent className="p-4 text-center space-y-3">
          <PartyPopper className="h-10 w-10 text-yellow-500 mx-auto animate-pulse" />
          <p className="font-bold text-lg">Çekiliş Sona Erdi!</p>
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-16 w-16 border-4 border-yellow-400">
              <AvatarImage src={giveaway.winner.photoURL || undefined} />
              <AvatarFallback>{giveaway.winner.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <p><strong className="text-primary">{giveaway.winner.username}</strong> kazandı!</p>
            <p className="font-semibold text-muted-foreground">Ödül: {giveaway.prize}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50 bg-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          Çekiliş Var!
        </CardTitle>
        <CardDescription>Ödül: <span className="font-bold text-foreground">{giveaway.prize}</span></CardDescription>
      </CardHeader>
      <CardContent>
        {isHost ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="font-semibold">{participantCount} Katılımcı</span>
            </div>
            <Button onClick={handleDrawWinner} disabled={isProcessing || participantCount === 0}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Kazananı Çek
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={handleJoin} disabled={isJoining || hasJoined}>
            {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : hasJoined ? <Check className="mr-2 h-4 w-4" /> : null}
            {hasJoined ? 'Katıldın' : 'Çekilişe Katıl'}
          </Button>
        )}
      </CardContent>
       {isHost && (
            <CardFooter>
                 <Button variant="link" size="sm" className="text-destructive p-0 h-auto" onClick={handleCancel} disabled={isProcessing}>
                    Çekilişi İptal Et
                </Button>
            </CardFooter>
        )}
    </Card>
  );
}
