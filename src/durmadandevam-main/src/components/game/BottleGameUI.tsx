// src/components/game/BottleGameUI.tsx
'use client';
import { useState } from 'react';
import type { ActiveGameSession } from '@/lib/types';
import { Button } from '../ui/button';
import { playGameMove } from '@/lib/actions/gameActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeftRight } from 'lucide-react';

interface BottleGameUIProps {
  game: ActiveGameSession;
  roomId: string;
  currentUser: { uid: string; username: string };
}

export default function BottleGameUI({ game, roomId, currentUser }: BottleGameUIProps) {
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const isHost = game.turn === currentUser.uid;

  const handleSpin = async () => {
    if (!isHost) return;
    setIsSpinning(true);
    try {
      await playGameMove(roomId, game.id, currentUser.uid, 'spin');
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    } finally {
      // The game ends immediately, so no need to set isSpinning to false
    }
  };
  
  return (
    <Card className="bg-background/50 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">{game.gameName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-around items-center">
            {game.players.map(player => (
                 <div key={player.uid} className="flex flex-col items-center gap-2">
                    <Avatar className="h-12 w-12 border-2">
                        <AvatarImage src={player.photoURL || undefined} />
                        <AvatarFallback>{player.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold truncate max-w-[80px]">{player.username}</p>
                 </div>
            ))}
        </div>
        {isHost && (
          <Button onClick={handleSpin} disabled={isSpinning} className="w-full">
            {isSpinning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Şişeyi Çevir
          </Button>
        )}
        {!isHost && (
             <p className="text-center text-sm text-muted-foreground">{game.players.find(p => p.uid === game.turn)?.username} adlı kullanıcının şişeyi çevirmesi bekleniyor.</p>
        )}
      </CardContent>
    </Card>
  );
}
