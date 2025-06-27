// src/components/rooms/RoomHeader.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MoreHorizontal, Users, Timer, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/types';
import { cn } from '@/lib/utils';
import { addSystemMessage, deleteRoomAsOwner } from '@/lib/actions/roomActions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RoomHeaderProps {
  room: Room;
  isHost: boolean;
  onParticipantListToggle: () => void;
}

// Zamanı hh:mm:ss formatına dönüştüren yardımcı fonksiyon
const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function RoomHeader({ room, isHost, onParticipantListToggle }: RoomHeaderProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [warningSent, setWarningSent] = useState(false);

    const expiresAt = room.expiresAt?.toDate().getTime();

    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const now = Date.now();
            const remainingSeconds = Math.round((expiresAt - now) / 1000);
            setTimeLeft(remainingSeconds > 0 ? remainingSeconds : 0);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [expiresAt]);
    
    // Countdown logic for warnings and deletion
    useEffect(() => {
        if (timeLeft === null || !user) return;
        
        // 15-saniye uyarısı
        if (timeLeft <= 15 && !warningSent && isHost) {
            setWarningSent(true);
            addSystemMessage(room.id, "⚠️ Bu oda 15 saniye içinde otomatik olarak kapanacak.");
        }

        // Oda silme
        if (timeLeft <= 0 && isHost) {
            // Prevent multiple triggers from the same client session
            if (sessionStorage.getItem(`room_deleted_${room.id}`) === 'true') return;
            sessionStorage.setItem(`room_deleted_${room.id}`, 'true');

            deleteRoomAsOwner(room.id, user.uid).then(result => {
                if(result.success) {
                    toast({ description: `"${room.name}" odası süresi dolduğu için kapatıldı.` });
                } else if(result.error) {
                    toast({ variant: 'destructive', description: result.error });
                }
            });
        }
    }, [timeLeft, warningSent, isHost, room.id, user, toast]);

    const isWarningTime = timeLeft !== null && timeLeft <= 15;

    return (
        <header className="flex items-center justify-between p-3 border-b border-gray-700/50 shrink-0">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon" className="rounded-full">
                    <Link href="/rooms"><ChevronLeft /></Link>
                </Button>
                <h1 className="text-md font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">{room.name}</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                 {timeLeft !== null && expiresAt && (
                     <div className={cn(
                        "flex items-center gap-1.5 text-sm font-semibold p-2 rounded-full transition-colors",
                        isWarningTime ? "bg-destructive/20 text-destructive" : "text-gray-400"
                     )}>
                        {isWarningTime ? <AlertTriangle className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                 )}
                 <Button variant="ghost" className="flex items-center gap-1.5 text-sm font-semibold p-2" onClick={onParticipantListToggle}>
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{room.participants?.length || 0}</span>
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreHorizontal />
                </Button>
            </div>
        </header>
    );
}
