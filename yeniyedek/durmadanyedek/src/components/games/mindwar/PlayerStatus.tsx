// src/components/games/mindwar/PlayerStatus.tsx
'use client';

// Bu bileşen, Zihin Savaşları oyunundaki tüm oyuncuların durumunu,
// rollerini ve kimin sırası olduğunu gösterir.

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MindWarPlayer, MindWarTurn } from '@/lib/types';
import { User, BrainCircuit, Hourglass, Skull, Eye } from 'lucide-react';

interface PlayerStatusProps {
  players: MindWarPlayer[]; // Oyuncu listesi
  currentTurn: MindWarTurn; // Mevcut tur bilgisi
  currentUserRole: string | undefined; // Mevcut kullanıcının rolü
  currentUserId: string; // Mevcut kullanıcının ID'si
}

export default function PlayerStatus({ players, currentTurn, currentUserRole, currentUserId }: PlayerStatusProps) {
  return (
    <div className="mb-4">
      {/* Kişisel Rol Bilgisi */}
      {currentUserRole && (
        <Card className="mb-3 bg-primary/10 border-primary/20">
          <CardContent className="p-3 text-center">
            <p className="text-sm text-muted-foreground">Senin Gizli Rolün</p>
            <p className="text-lg font-bold text-primary">{currentUserRole}</p>
          </CardContent>
        </Card>
      )}

      {/* Diğer Oyuncuların Listesi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {players.map(player => {
          const isActive = player.uid === currentTurn.activePlayerUid; // Sıra bu oyuncuda mı?
          const isEliminated = player.status === 'eliminated'; // Oyuncu elendi mi?
          const isSelf = player.uid === currentUserId; // Bu kart mevcut kullanıcıya mı ait?

          return (
            <TooltipProvider key={player.uid}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all duration-300",
                      isActive ? "border-amber-400 bg-amber-400/10 shadow-lg" : "border-transparent bg-muted/50",
                      isEliminated && "opacity-40 grayscale"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={player.photoURL || undefined} />
                        <AvatarFallback>{player.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {/* Durum ikonu */}
                      <div className="absolute -bottom-1 -right-1 bg-background p-1 rounded-full shadow-md">
                        {isEliminated ? (
                          <Skull size={14} className="text-destructive" />
                        ) : isActive ? (
                          <Hourglass size={14} className="text-amber-500 animate-pulse" />
                        ) : (
                          <Eye size={14} className="text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-semibold truncate max-w-[80px]">{player.username}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isEliminated ? `${player.username} (Elendi)` : isActive ? `${player.username} (Sırası)` : player.username}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
