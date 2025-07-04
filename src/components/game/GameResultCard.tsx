// src/components/game/GameResultCard.tsx
'use client';
import type { ActiveGameSession } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gem, Meh } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';

interface GameResultCardProps {
  game: ActiveGameSession;
}

export default function GameResultCard({ game }: GameResultCardProps) {
  const winner = game.winnerId ? game.players.find(p => p.uid === game.winnerId) : null;

  return (
    <Card className="w-full bg-card border-primary/20 shadow-lg animate-in fade-in duration-500 rounded-2xl overflow-hidden">
      <CardContent className="p-4 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-lg font-bold text-foreground">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <span>Oyun Bitti!</span>
        </div>
        
        {winner ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-16 w-16 border-4 border-yellow-400">
                <AvatarImage src={winner.photoURL || undefined} />
                <AvatarFallback>{winner.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="font-bold text-primary text-xl">{winner.username}</p>
            <p className="text-sm text-muted-foreground">kazandı ve <span className="font-bold text-foreground flex items-center justify-center gap-1">1 <Gem className="h-4 w-4 text-cyan-400"/></span> kazandı!</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
             <Meh className="h-16 w-16 text-muted-foreground" />
             <p className="font-bold text-lg">Berabere!</p>
             <p className="text-sm text-muted-foreground">Kimse kazanamadı. Tekrar deneyin!</p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
