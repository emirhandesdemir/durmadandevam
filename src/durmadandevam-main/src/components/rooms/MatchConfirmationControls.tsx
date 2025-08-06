// src/components/rooms/MatchConfirmationControls.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, Loader2, Hourglass } from 'lucide-react';
import type { Room } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { handleMatchConfirmation } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MatchConfirmationControlsProps {
    room: Room;
    currentUserId: string;
}

const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function MatchConfirmationControls({ room, currentUserId }: MatchConfirmationControlsProps) {
    const { toast } = useToast();
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isResponding, setIsResponding] = useState(false);
    
    const userStatus = room.matchConfirmation?.[currentUserId];

    useEffect(() => {
        if (!room.confirmationExpiresAt) return;
        const expiresAtMs = (room.confirmationExpiresAt as Timestamp).toMillis();

        const updateTimer = () => {
            const remaining = Math.round((expiresAtMs - Date.now()) / 1000);
            if (remaining <= 0) {
                 setTimeLeft(0);
                 if (userStatus === 'pending') {
                    // Automatically decline if timer runs out
                    handleResponse(false);
                 }
            } else {
                 setTimeLeft(remaining);
            }
        };
        
        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room.confirmationExpiresAt, userStatus]);

    const handleResponse = async (accepted: boolean) => {
        setIsResponding(true);
        try {
            await handleMatchConfirmation(room.id, currentUserId, accepted);
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        } finally {
            // No need to set isResponding to false, as the UI will change based on props
        }
    };
    
    let content;
    
    if (room.status === 'converting') {
        content = (
            <div className="flex flex-col items-center text-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="font-semibold">Sohbetiniz kalıcı hale getiriliyor...</p>
            </div>
        )
    } else if (userStatus === 'pending') {
        content = (
             <div className="flex gap-4">
                <Button onClick={() => handleResponse(true)} disabled={isResponding} size="lg" className="rounded-full bg-green-500 hover:bg-green-600 flex-1">
                    <Heart className="mr-2 h-5 w-5 fill-white"/>
                    Kabul Et
                </Button>
                 <Button onClick={() => handleResponse(false)} disabled={isResponding} size="lg" variant="destructive" className="rounded-full flex-1">
                    <X className="mr-2 h-5 w-5"/>
                    Reddet
                </Button>
            </div>
        );
    } else if (userStatus === 'accepted') {
        content = (
             <div className="flex flex-col items-center text-center gap-2 text-muted-foreground">
                <Hourglass className="h-6 w-6 animate-spin" />
                <p className="font-semibold">Diğer kullanıcının onayı bekleniyor...</p>
            </div>
        )
    } else { // declined
         content = (
             <div className="flex flex-col items-center text-center gap-2 text-destructive">
                <p className="font-semibold">Eşleşme reddedildi.</p>
            </div>
        )
    }

    return (
        <Card className="m-4 bg-muted/50 border-dashed animate-in fade-in">
            <CardContent className="p-4 flex flex-col items-center gap-3">
                 <div className="flex items-center gap-2 text-lg font-bold">
                    <Hourglass className="h-5 w-5"/>
                    <span>Kalan Süre: {timeLeft !== null ? formatTime(timeLeft) : '...'}</span>
                </div>
                {isResponding ? <Loader2 className="h-8 w-8 animate-spin my-4"/> : content}
            </CardContent>
        </Card>
    )
}
