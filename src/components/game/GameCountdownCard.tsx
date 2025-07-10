// src/components/game/GameCountdownCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ActiveGame } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

interface GameCountdownCardProps {
    game: ActiveGame;
}

const COUNTDOWN_DURATION = 60; // 1 dakika

export default function GameCountdownCard({ game }: GameCountdownCardProps) {
    const [timeLeft, setTimeLeft] = useState(COUNTDOWN_DURATION);

    useEffect(() => {
        if (!game.countdownStartTime) return;
        const startTimeMs = (game.countdownStartTime as Timestamp).toMillis();
        
        const updateTimer = () => {
            const timeElapsed = Math.floor((Date.now() - startTimeMs) / 1000);
            const newTimeLeft = Math.max(0, COUNTDOWN_DURATION - timeElapsed);
            setTimeLeft(newTimeLeft);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [game.countdownStartTime]);
    
    const progress = (timeLeft / COUNTDOWN_DURATION) * 100;

    return (
        <Card className="w-full bg-card border-primary/20 shadow-lg animate-in fade-in duration-500 rounded-2xl overflow-hidden">
            <CardContent className="p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                    <Timer className="h-6 w-6 text-primary animate-pulse" />
                    <p className="text-lg font-bold text-foreground">Yeni Oyun Başlıyor!</p>
                </div>
                 <p className="text-sm text-muted-foreground">
                    Hazır ol, quiz <span className="font-bold text-primary text-base">{timeLeft}</span> saniye içinde başlıyor.
                </p>
            </CardContent>
            <div className="w-full bg-primary/10 h-1.5">
                <div 
                    className="bg-primary h-full transition-all duration-1000 ease-linear" 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </Card>
    );
}
