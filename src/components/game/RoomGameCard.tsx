// src/components/game/RoomGameCard.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActiveGame, GameSettings } from "@/lib/types";

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
        <Card className="w-full bg-gradient-to-br from-purple-600 to-indigo-700 text-primary-foreground border-0 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Hızlı Quiz!</CardTitle>
                    <div className="text-2xl font-bold">{timeLeft}s</div>
                </div>
                <Progress value={progress} className="w-full h-2 bg-white/20 [&>div]:bg-yellow-400" />
            </CardHeader>
            <CardContent>
                <p className="text-center font-semibold text-xl mb-4">
                    {game.question}
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {game.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-white/10 rounded-lg text-sm">
                           <span className="font-bold bg-white/20 text-white rounded-full h-6 w-6 flex items-center justify-center">{index + 1}</span>
                           <span>{option}</span>
                        </div>
                    ))}
                </div>
                <p className="text-center text-xs mt-3 text-primary-foreground/70">
                    Cevaplamak için sohbeti kullan: /answer &lt;numara&gt;
                </p>
            </CardContent>
        </Card>
    );
}
