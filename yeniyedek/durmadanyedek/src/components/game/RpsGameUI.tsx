// src/components/game/RpsGameUI.tsx
'use client';
import { useState } from 'react';
import type { ActiveGameSession } from '@/lib/types';
import { Button } from '../ui/button';
import { playGameMove } from '@/lib/actions/gameActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Hand, Scissors, Scroll } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';

const moves = [
  { name: 'rock', icon: Hand },
  { name: 'paper', icon: Scroll },
  { name: 'scissors', icon: Scissors },
];

interface RpsGameUIProps {
  game: ActiveGameSession;
  roomId: string;
  currentUser: { uid: string; username: string };
}

export default function RpsGameUI({ game, roomId, currentUser }: RpsGameUIProps) {
  const { toast } = useToast();
  const [isChoosing, setIsChoosing] = useState(false);
  const isPlayer = game.players.some(p => p.uid === currentUser.uid);
  const hasMoved = !!game.moves[currentUser.uid];

  const handleChoose = async (move: string) => {
    if (!isPlayer || hasMoved) return;
    setIsChoosing(true);
    try {
      await playGameMove(roomId, game.id, currentUser.uid, move);
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    } finally {
      setIsChoosing(false);
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
              <div className="h-12 w-12 flex items-center justify-center text-2xl">
                {game.moves[player.uid] ? '✔️' : '...'}
              </div>
            </div>
          ))}
        </div>
        {isPlayer && !hasMoved && (
          <div className="flex justify-center gap-2">
            {moves.map(move => (
              <Button key={move.name} size="icon" variant="outline" onClick={() => handleChoose(move.name)} disabled={isChoosing}>
                <move.icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        )}
        {isPlayer && hasMoved && (
            <p className="text-center text-sm text-muted-foreground">Rakibin hamlesi bekleniyor...</p>
        )}
      </CardContent>
    </Card>
  );
}
