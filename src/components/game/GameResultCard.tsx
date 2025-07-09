
// src/components/game/GameResultCard.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PartyPopper, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function GameResultCard({ game }: { game: any }) {
  if (!game) return null;

  const getWinnerText = () => {
    if (!game.winnerId) return "Kimse kazanamadı!";
    const winner = game.players.find((p: any) => p.uid === game.winnerId);
    if (winner) return `${winner.username} kazandı!`;
    return "Oyun bitti!";
  };

  return (
    <Card className="border-amber-400 bg-amber-500/10">
      <CardHeader className="text-center">
        <Award className="mx-auto h-10 w-10 text-amber-500" />
        <CardTitle>Oyun Bitti!</CardTitle>
        <CardDescription>{game.gameName || 'Oyun'}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="font-bold text-lg">{getWinnerText()}</p>
      </CardContent>
    </Card>
  );
}
