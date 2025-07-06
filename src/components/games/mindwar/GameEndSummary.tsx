// src/components/games/mindwar/GameEndSummary.tsx
'use client';

// Bu bileşen, Zihin Savaşları oyunu bittiğinde kazananı,
// oyun özetini ve oyuncuların performans puanlarını gösterir.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Gem, BrainCircuit, Heart, Shield, Award } from 'lucide-react';
import type { MindWarSession } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

interface GameEndSummaryProps {
  session: MindWarSession; // Tamamlanmış oyun oturumu
}

export default function GameEndSummary({ session }: GameEndSummaryProps) {
  // Oyun sonu verileri yoksa, bileşeni gösterme
  if (!session.endSummary) {
    return null;
  }

  const { narrative, scores, winner } = session.endSummary;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-yellow-400 bg-yellow-400/10 shadow-lg">
        <CardHeader className="text-center">
          <Trophy className="h-12 w-12 text-yellow-500 mx-auto" />
          <CardTitle className="text-2xl font-bold">Oyun Bitti!</CardTitle>
          <CardDescription>{narrative}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Kazananı gösteren bölüm */}
          {winner && (
            <div className="text-center p-4 bg-background rounded-lg">
              <h3 className="font-bold text-lg text-primary">Kazanan: {winner}</h3>
            </div>
          )}

          {/* Oyuncu Puanları */}
          <div className="space-y-4">
            <h4 className="font-semibold text-center">Performans Raporu</h4>
            {Object.entries(scores).map(([uid, score]) => {
              const player = session.players.find(p => p.uid === uid);
              if (!player) return null;

              return (
                <div key={uid} className="flex items-center gap-3 p-2 border rounded-md bg-background/50">
                  <Avatar>
                    <AvatarImage src={player.photoURL || undefined} />
                    <AvatarFallback>{player.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-bold">{player.username}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><BrainCircuit size={12} /> Zeka: {score.intelligence}</span>
                      <span className="flex items-center gap-1"><Heart size={12} /> Güven: {score.trust}</span>
                      <span className="flex items-center gap-1"><Shield size={12} /> Cesaret: {score.courage}</span>
                    </div>
                  </div>
                  {score.reward > 0 && (
                    <div className="flex items-center gap-1 font-bold text-cyan-500">
                      +{score.reward} <Gem size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
