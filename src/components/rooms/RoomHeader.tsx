// src/components/rooms/RoomHeader.tsx
"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, MoreHorizontal, Users, UserPlus, Gift, Zap, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/types';
import InviteDialog from './InviteDialog';
import OpenPortalDialog from './OpenPortalDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Timestamp } from 'firebase/firestore';
import { addSystemMessage } from '@/lib/actions/roomActions';

interface RoomHeaderProps {
  room: Room;
  isHost: boolean;
  onParticipantListToggle: () => void;
  onBackClick: () => void;
  isSpeakerLayoutCollapsed: boolean;
  onToggleCollapse: () => void;
}

const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function RoomHeader({ room, isHost, onParticipantListToggle, onBackClick, isSpeakerLayoutCollapsed, onToggleCollapse }: RoomHeaderProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isPortalDialogOpen, setIsPortalDialogOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [warningSent, setWarningSent] = useState(false);

    useEffect(() => {
        if (!room.expiresAt) return;
        const expiresAtMs = (room.expiresAt as Timestamp).toMillis();
        const updateTimer = () => {
            const remaining = Math.round((expiresAtMs - Date.now()) / 1000);
            setTimeLeft(remaining > 0 ? remaining : 0);
        };
        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [room.expiresAt]);
    
    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && timeLeft <= 300 && !warningSent) {
            addSystemMessage(room.id, "⏰ Oda 5 dakika içinde kapanacak!");
            setWarningSent(true);
        }
    }, [timeLeft, room.id, warningSent]);


    const hasActivePortal = room.portalExpiresAt && (room.portalExpiresAt as Timestamp).toMillis() > Date.now();

    return (
        <>
            <header className="flex items-center justify-between p-3 border-b shrink-0 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                    <Button onClick={onBackClick} variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft />
                    </Button>
                    
                    {isHost && (
                         <div className="relative">
                            <Button onClick={() => setIsPortalDialogOpen(true)} variant="ghost" size="icon" className="rounded-full text-yellow-400 hover:text-yellow-300 animate-pulse" disabled={hasActivePortal}>
                                <Zap className="h-5 w-5" />
                            </Button>
                             <div className="absolute inset-0 -z-10 bg-yellow-400/50 blur-lg animate-pulse rounded-full"></div>
                        </div>
                    )}

                    <div>
                        <h1 className="text-md font-bold truncate max-w-[120px] sm:max-w-[180px] text-primary shadow-primary/50 [text-shadow:_0_0_8px_var(--tw-shadow-color)]">{room.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>ID: {room.id.substring(0, 10)}</span>
                             {timeLeft !== null && room.expiresAt && (
                                <>
                                    <span>·</span>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTime(timeLeft)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                     <Button variant="ghost" size="icon" className="rounded-full">
                        <Gift className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onParticipantListToggle}>
                        <Users className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onToggleCollapse}>
                       {isSpeakerLayoutCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </Button>
                    {isHost && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsInviteOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Davet Et
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
            <OpenPortalDialog
                isOpen={isPortalDialogOpen}
                onOpenChange={setIsPortalDialogOpen}
                roomId={room.id}
                roomName={room.name}
            />
        </>
    );
}
