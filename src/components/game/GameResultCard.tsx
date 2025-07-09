// This component has been removed because the Quiz Game system was removed.
import type { ActiveGame, ActiveGameSession } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Meh } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface GameResultCardProps {
  game: any;
}

export default function GameResultCard({ game }: GameResultCardProps) {
  if (!game) return null;

  const getWinnerText = () => {
    if (!game.winnerId && !game.winner) return "Kimse kazanamadı!";
    const winner = 'players' in game ? game.players.find((p: any) => p.uid === game.winnerId) : null;
    if (winner) return `${winner.username} kazandı!`;
    if (game.winner) return `${game.winner} kazandı!`;
    return "Oyun bitti!";
  };

  const getWinnerInfo = () => {
      if (!game) return null;
      if (game.winner) return game.winner;
      if (game.winnerId && game.players) return game.players.find((p: any) => p.uid === game.winnerId);
      return null;
  }
  
  const winnerInfo = getWinnerInfo();

  return (
    <Card className="border-amber-400 bg-amber-500/10">
      <CardContent className="p-4 text-center space-y-3">
        <Trophy className="h-10 w-10 text-yellow-500 mx-auto" />
        <p className="font-bold text-lg">Oyun Bitti!</p>
        {winnerInfo ? (
             <div className="flex flex-col items-center gap-2">
                <Avatar className="h-16 w-16 border-4 border-yellow-400">
                <AvatarImage src={winnerInfo.photoURL || undefined} />
                <AvatarFallback>{winnerInfo.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <p><strong className="text-primary">{winnerInfo.username}</strong> kazandı!</p>
                <p className="font-semibold text-muted-foreground">Ödül: {game.gameName || 'Oyun'}</p>
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
