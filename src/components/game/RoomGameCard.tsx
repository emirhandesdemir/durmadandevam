// src/components/game/RoomGameCard.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ActiveGame, GameSettings } from "@/lib/types";
import { Puzzle, Loader2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";

interface RoomGameCardProps {
    game: ActiveGame;
    settings: GameSettings;
    onAnswerSubmit: (answerIndex: number) => void;
    currentUserId: string;
}

/**
 * Oda içindeki aktif quiz oyununu gösteren kart bileşeni.
 * Soru, tıklanabilir seçenekler ve geri sayım sayacını içerir.
 */
export default function RoomGameCard({ game, settings, onAnswerSubmit, currentUserId }: RoomGameCardProps) {
    const questionDuration = settings.questionTimerSeconds || 20;
    const [timeLeft, setTimeLeft] = useState(questionDuration);
    const [progress, setProgress] = useState(100);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const currentQuestion = game.questions[game.currentQuestionIndex];
    const hasAnswered = (game.answeredBy || []).includes(currentUserId);
    const isDisabled = hasAnswered || isSubmitting;

    useEffect(() => {
        if (!game.startTime) return;

        const startTimeMs = (game.startTime as Timestamp).toMillis();
        
        const updateTimer = () => {
            const timeElapsed = Date.now() - startTimeMs;
            const newTimeLeft = Math.max(0, Math.ceil((questionDuration * 1000 - timeElapsed) / 1000));
            setTimeLeft(newTimeLeft);

            const newProgress = Math.max(0, (newTimeLeft / questionDuration) * 100);
            setProgress(newProgress);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [game.id, game.startTime, questionDuration, game.currentQuestionIndex]);


    const handleAnswerClick = async (index: number) => {
        if (isDisabled) return;
        setSelectedAnswer(index);
        setIsSubmitting(true);
        await onAnswerSubmit(index);
    };

    if (!currentQuestion) {
        return (
            <Card className="w-full bg-card border-primary/20 shadow-lg">
                <CardContent className="p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto"/>
                    <p className="text-muted-foreground mt-2">Soru yükleniyor...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full bg-card border-primary/20 shadow-lg animate-in fade-in duration-500 rounded-2xl">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-start sm:items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full shrink-0">
                        <Puzzle className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-foreground leading-tight">{`Soru ${game.currentQuestionIndex + 1}/${game.questions.length}: ${currentQuestion.question}`}</p>
                        <p className="text-xs text-muted-foreground mt-1">Doğru cevabı bulmak için {timeLeft} saniyen var!</p>
                    </div>
                </div>
                
                <Progress value={progress} className="h-1.5" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentQuestion.options.map((option, index) => (
                        <Button
                            key={index}
                            variant={selectedAnswer === index ? "default" : "outline"}
                            className={cn(
                                "w-full justify-start h-auto py-2 text-wrap",
                                isDisabled && selectedAnswer !== index && "opacity-50"
                            )}
                            onClick={() => handleAnswerClick(index)}
                            disabled={isDisabled}
                        >
                            {isSubmitting && selectedAnswer === index && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            <span className="font-semibold text-primary mr-2">{String.fromCharCode(65 + index)}.</span>
                            <span className="text-left flex-1">{option}</span>
                        </Button>
                    ))}
                </div>
                 {hasAnswered && (
                    <p className="text-center text-xs text-green-600 font-semibold pt-2">
                        Cevabın gönderildi, sonuçlar bekleniyor...
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
