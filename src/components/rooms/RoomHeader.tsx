// src/components/rooms/RoomHeader.tsx
"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, MoreHorizontal, Users, Timer, AlertTriangle, UserPlus, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/types';
import { cn } from '@/lib/utils';
import { addSystemMessage, deleteExpiredRoom } from '@/lib/actions/roomActions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import InviteDialog from './InviteDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RoomHeaderProps {
  room: Room;
  isHost: boolean;
  onParticipantListToggle: () => void;
  onBackClick: () => void;
  onStartGameClick: () => void;
}

// Zamanı hh:mm:ss formatına dönüştüren yardımcı fonksiyon
const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function RoomHeader({ room, isHost, onParticipantListToggle, onBackClick, onStartGameClick }: RoomHeaderProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [warningSent, setWarningSent] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);

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
        
        // 15-saniye uyarısı (sadece host tarafından gönderilir, spamı önlemek için)
        if (timeLeft <= 15 && !warningSent && isHost) {
            setWarningSent(true);
            addSystemMessage(room.id, "⚠️ Bu oda 15 saniye içinde otomatik olarak kapanacak.");
        }

        // Oda silme (odadaki herhangi bir kullanıcı tarafından tetiklenir)
        if (timeLeft <= 0) {
            // Aynı istemci tarafından birden fazla tetiklemeyi önle
            if (sessionStorage.getItem(`room_deleted_${room.id}`) === 'true') return;
            sessionStorage.setItem(`room_deleted_${room.id}`, 'true');

            // Yeni ve güvenli sunucu eylemini çağır
            deleteExpiredRoom(room.id).then(result => {
                if(result.success) {
                    toast({ description: `"${room.name}" odası süresi dolduğu için kapatıldı.` });
                }
            });
        }
    }, [timeLeft, warningSent, isHost, room.id, user, toast, room.name]);

    const isWarningTime = timeLeft !== null && timeLeft <= 15;

    return (
        <>
            <header className="flex items-center justify-between p-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                    <Button onClick={onBackClick} variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft />
                    </Button>
                    <h1 className="text-md font-bold truncate max-w-[120px] sm:max-w-[180px]">{room.name}</h1>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    {timeLeft !== null && expiresAt && (
                        <div className={cn(
                            "flex items-center gap-1.5 text-sm font-semibold p-2 rounded-full transition-colors",
                            isWarningTime ? "bg-destructive/20 text-destructive" : "text-muted-foreground"
                        )}>
                            {isWarningTime ? <AlertTriangle className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                            <span className="hidden sm:inline">{formatTime(timeLeft)}</span>
                        </div>
                    )}
                    <Button variant="ghost" className="flex items-center gap-1.5 text-sm font-semibold p-2" onClick={onParticipantListToggle}>
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{room.participants?.length || 0}</span>
                    </Button>
                     <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsInviteOpen(true)}>
                        <UserPlus className="h-5 w-5" />
                    </Button>
                    {isHost && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onStartGameClick}>
                                    <Gamepad2 className="mr-2 h-4 w-4"/>
                                    Oyun Başlat
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>
            <InviteDialog
                isOpen={isInviteOpen}
                onOpenChange={setIsInviteOpen}
                roomId={room.id}
                roomName={room.name}
            />
        </>
    );
}
