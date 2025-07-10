// src/components/game/GameResultCard.tsx
'use client';
import type { ActiveGame, GameSettings } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gem, Meh } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface GameResultCardProps {
  game: ActiveGame;
  settings?: GameSettings; // Make settings optional for flexibility
}

export default function GameResultCard({ game, settings }: GameResultCardProps) {
  const { userData } = useAuth();
  const winner = game.winner;
  const prize = settings?.rewardAmount || 10; // Default to 10 if not provided

  return (
    <Card className="w-full bg-card border-primary/20 shadow-lg animate-in fade-in duration-500 rounded-2xl overflow-hidden">
      <CardContent className="p-4 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-lg font-bold text-foreground">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <span>Oyun Bitti!</span>
        </div>
        
        {winner && winner === userData?.username ? (
          <div className="flex flex-col items-center gap-2">
             <p className="font-bold text-primary text-xl">Tebrikler, {winner}!</p>
             <p className="text-sm text-muted-foreground">Doğru cevabı bildin ve <span className="font-bold text-foreground flex items-center justify-center gap-1">{prize} <Gem className="h-4 w-4 text-cyan-400"/></span> kazandın!</p>
          </div>
        ) : winner ? (
            <div className="flex flex-col items-center gap-2">
                <p className="font-bold text-primary text-xl">{winner} kazandı!</p>
                <p className="text-sm text-muted-foreground">{prize} elmas kazandı.</p>
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
