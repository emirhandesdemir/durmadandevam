// src/components/game/DiceGameUI.tsx
'use client';
import { useState } from 'react';
import type { ActiveGameSession } from '@/lib/types';
import { Button } from '../ui/button';
import { playGameMove } from '@/lib/actions/gameActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const DiceIcon = ({ roll }: { roll: number }) => {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Icon = icons[roll - 1] || Dice1;
  return <Icon className="h-10 w-10 text-primary" />;
};

interface DiceGameUIProps {
  game: ActiveGameSession;
  roomId: string;
  currentUser: { uid: string; username: string };
}

export default function DiceGameUI({ game, roomId, currentUser }: DiceGameUIProps) {
  const { toast } = useToast();
  const [isRolling, setIsRolling] = useState(false);
  const isPlayer = game.players.some(p => p.uid === currentUser.uid);
  const hasMoved = !!game.moves[currentUser.uid];

  const handleRoll = async () => {
    if (!isPlayer || hasMoved) return;
    setIsRolling(true);
    try {
      await playGameMove(roomId, game.id, currentUser.uid, 'roll');
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    } finally {
      setIsRolling(false);
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
              <div className="h-12 w-12 flex items-center justify-center">
                {game.moves[player.uid] ? (
                  <DiceIcon roll={game.moves[player.uid] as number} />
                ) : (
                  <p className="text-sm text-muted-foreground">Bekliyor</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {isPlayer && (
          <Button onClick={handleRoll} disabled={hasMoved || isRolling} className="w-full">
            {isRolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasMoved ? 'Zar Atıldı' : 'Zar At'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
