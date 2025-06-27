// src/components/game/GameCountdownCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Timer } from "lucide-react";

interface GameCountdownCardProps {
    timeLeft: number;
}

/**
 * Yeni bir quiz oyunu başlamadan önce gösterilen geri sayım kartı.
 */
export default function GameCountdownCard({ timeLeft }: GameCountdownCardProps) {
    const progress = (timeLeft / 20) * 100;

    return (
        <Card className="w-full bg-card border-primary/20 shadow-lg animate-in fade-in duration-500 rounded-2xl overflow-hidden">
            <CardContent className="p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                    <Timer className="h-6 w-6 text-primary animate-pulse" />
                    <p className="text-lg font-bold text-foreground">Yeni Oyun Başlıyor!</p>
                </div>
                 <p className="text-sm text-muted-foreground">
                    Hazır ol, sonraki soru <span className="font-bold text-primary text-base">{timeLeft}</span> saniye içinde geliyor.
                </p>
            </CardContent>
            {/* İlerleme çubuğu altta */}
            <div className="w-full bg-primary/10 h-1.5">
                <div 
                    className="bg-primary h-full transition-all duration-1000 ease-linear" 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </Card>
    );
}
