// src/components/game/GameResultCard.tsx
'use client';
import type { ActiveGame, GameSettings } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gem, Meh, Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface GameResultCardProps {
  game: ActiveGame;
  settings?: GameSettings; // Make settings optional for flexibility
}

export default function GameResultCard({ game, settings }: GameResultCardProps) {
  const { userData } = useAuth();
  const winners = game.winners || [];
  const prize = winners[0]?.reward || 10;
  
  const isWinner = userData ? winners.some(w => w.uid === userData.uid) : false;
  
  // Check if the user participated by checking if their ID is in answeredBy or scores
  const participated = userData ? (game.answeredBy?.includes(userData.uid) || (game.scores && game.scores[userData.uid] !== undefined)) : false;

  return (
    <Card className="w-full bg-card border-primary/20 shadow-lg animate-in fade-in duration-500 rounded-2xl overflow-hidden">
      <CardContent className="p-4 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-lg font-bold text-foreground">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <span>Oyun Bitti!</span>
        </div>
        
        {isWinner ? (
          <div className="flex flex-col items-center gap-2">
             <p className="font-bold text-primary text-xl">Tebrikler, Kazandın!</p>
             <p className="text-sm text-muted-foreground">Doğru cevaplarınla <span className="font-bold text-foreground flex items-center justify-center gap-1">{prize} <Gem className="h-4 w-4 text-cyan-400"/></span> kazandın!</p>
          </div>
        ) : participated ? (
           <div className="flex flex-col items-center gap-2">
             <Gift className="h-8 w-8 text-muted-foreground" />
             <p className="font-bold text-lg">Katılımın İçin Teşekkürler!</p>
             <p className="text-sm text-muted-foreground">Teselli ödülü olarak <span className="font-bold text-foreground flex items-center justify-center gap-1">3 <Gem className="h-4 w-4 text-cyan-400"/></span> kazandın.</p>
          </div>
        ) : winners.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
                <p className="font-bold text-primary text-xl">{winners.map(w => w.username).join(', ')} kazandı!</p>
                <p className="text-sm text-muted-foreground">{prize} elmas kazandılar.</p>
            </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
             <Meh className="h-16 w-16 text-muted-foreground" />
             <p className="font-bold text-lg">Kimse Bilemedi!</p>
             <p className="text-sm text-muted-foreground">Katılan herkes teselli ödülü kazandı. Tekrar deneyin!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
