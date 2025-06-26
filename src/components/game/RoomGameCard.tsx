// src/components/game/RoomGameCard.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ActiveGame, GameSettings } from "@/lib/types";
import { Puzzle } from "lucide-react";

interface RoomGameCardProps {
    game: ActiveGame;
    roomId: string;
    settings: GameSettings;
}

/**
 * Oda içindeki aktif quiz oyununu gösteren kart bileşeni.
 * Soru, seçenekler ve geri sayım sayacını içerir.
 */
export default function RoomGameCard({ game, settings }: RoomGameCardProps) {
    const [timeLeft, setTimeLeft] = useState(settings.questionTimerSeconds);
    const [progress, setProgress] = useState(100);

    // Geri sayım sayacını yöneten useEffect
    useEffect(() => {
        // Yeni bir oyun başladığında zamanlayıcıyı sıfırla
        setTimeLeft(settings.questionTimerSeconds);
        
        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [game.id, settings.questionTimerSeconds]); // game.id değiştiğinde (yeni oyun) yeniden başlar

    // İlerleme çubuğunu güncelleyen useEffect
    useEffect(() => {
        const newProgress = (timeLeft / settings.questionTimerSeconds) * 100;
        setProgress(newProgress);
    }, [timeLeft, settings.questionTimerSeconds]);

    return (
        <Card className="w-full bg-card border-primary/20 shadow-lg animate-in fade-in duration-500 rounded-2xl">
            <CardContent className="p-4 space-y-4">
                {/* Header section with icon and question */}
                <div className="flex items-start sm:items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full shrink-0">
                        <Puzzle className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-foreground leading-tight">{game.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">Doğru cevabı bulmak için {timeLeft} saniyen var!</p>
                    </div>
                </div>
                
                {/* Progress bar */}
                <Progress value={progress} className="h-1.5" />

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {game.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
                           <span className="font-semibold text-primary">{index + 1}.</span>
                           <span className="text-foreground">{option}</span>
                        </div>
                    ))}
                </div>
                
                {/* Help text */}
                <p className="text-center text-xs text-muted-foreground pt-2">
                    Cevapla: <code className="bg-muted px-2 py-1 rounded-md text-primary font-mono font-semibold">/answer &lt;numara&gt;</code>
                </p>
            </CardContent>
        </Card>
    );
}
