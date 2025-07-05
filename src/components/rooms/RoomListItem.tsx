// src/components/rooms/RoomListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Clock, Users, XCircle, Zap, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";

interface RoomListItemProps {
    room: Room;
}

const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function RoomListItem({ room }: RoomListItemProps) {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const hasPortal = room.portalExpiresAt && (room.portalExpiresAt as Timestamp).toDate() > new Date();
    const isEvent = room.type === 'event';

    useEffect(() => {
        if (!room.expiresAt) {
            setTimeLeft(null); // No expiration for event rooms
            return;
        }

        const expiresAtMs = (room.expiresAt as Timestamp).toMillis();

        const updateTimer = () => {
            const remaining = Math.round((expiresAtMs - Date.now()) / 1000);
            setTimeLeft(remaining > 0 ? remaining : 0);
        };
        
        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [room.expiresAt]);

    const participants = room.participants || [];
    const isFull = participants.length >= room.maxParticipants;
    const isParticipant = participants.some(p => p.uid === currentUser?.uid);
    const isExpired = timeLeft === 0;
    
    const isDisabled = (isFull && !isParticipant) || isExpired;

    const handleCardClick = () => {
        if (!isDisabled) {
            router.push(`/rooms/${room.id}`);
        }
    };

    const StatusIndicator = () => {
        if (isExpired) {
            return (
                <TooltipProvider>
                    <Tooltip><TooltipTrigger><XCircle className="h-5 w-5 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Süresi Doldu</p></TooltipContent></Tooltip>
                </TooltipProvider>
            );
        }
        if (isFull && !isParticipant) {
             return (
                <TooltipProvider>
                    <Tooltip><TooltipTrigger><XCircle className="h-5 w-5 text-destructive" /></TooltipTrigger><TooltipContent><p>Oda Dolu</p></TooltipContent></Tooltip>
                </TooltipProvider>
            );
        }
        return (
            <TooltipProvider>
                <Tooltip><TooltipTrigger><ArrowRight className="h-5 w-5 text-primary" /></TooltipTrigger><TooltipContent><p>Odaya Gir</p></TooltipContent></Tooltip>
            </TooltipProvider>
        );
    }
    
    const cardBorder = hasPortal 
    ? "border-primary/50 shadow-primary/10" 
    : isEvent 
        ? "border-amber-400/50 shadow-amber-400/10" 
        : "border-border";

    return (
        <Card onClick={handleCardClick} className={cn(
            "group overflow-hidden transition-all duration-300 flex flex-col rounded-2xl shadow-lg",
            cardBorder,
            isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-xl hover:-translate-y-1",
            isParticipant && !isDisabled && "hover:border-green-500/50"
        )}>
             {isExpired && (
                <div className="absolute inset-0 bg-background/80 z-20 flex items-center justify-center">
                    <p className="font-bold text-lg text-muted-foreground">Süresi Doldu</p>
                </div>
            )}
             {(hasPortal || isEvent) && (
                <div className="absolute top-3 right-3 z-10">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="relative p-1.5 bg-background/50 backdrop-blur-sm rounded-full">
                                    {hasPortal ? <Zap className="h-5 w-5 text-primary"/> : <Gift className="h-5 w-5 text-amber-500"/>}
                                    {hasPortal && <div className="absolute inset-0 -z-10 animate-ping bg-primary blur-md rounded-full"></div>}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent><p>{hasPortal ? 'Bu odaya bir portal açık!' : 'Etkinlik Odası'}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}

            <CardHeader>
                <CardTitle className="truncate">{room.name}</CardTitle>
                <CardDescription className="truncate h-10">{room.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-1">
                <div className="flex items-center justify-between">
                    <Link href={`/profile/${room.createdBy.uid}`} className="flex items-center gap-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className={cn("avatar-frame-wrapper", room.createdBy.selectedAvatarFrame)}>
                             <Avatar className="relative z-[1] h-8 w-8">
                                <AvatarImage src={room.createdBy.photoURL || undefined} />
                                <AvatarFallback>{room.createdBy.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <span className="text-xs font-medium truncate">{room.createdBy.username}</span>
                    </Link>
                    <div className="flex -space-x-2">
                        {participants.slice(0, 4).map(p => (
                            <TooltipProvider key={p.uid}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Avatar className="h-8 w-8 border-2 border-background">
                                            <AvatarImage src={p.photoURL || undefined} />
                                            <AvatarFallback>{p.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{p.username}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                         {participants.length > 4 && (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground border-2 border-background">
                                +{participants.length - 4}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-muted/50 p-3 flex justify-between items-center text-sm mt-auto border-t">
                 <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Users className="h-4 w-4"/><span>{participants.length} / {room.maxParticipants}</span></div>
                    {timeLeft !== null && !isExpired && (
                        <div className="flex items-center gap-1.5"><Clock className="h-4 w-4"/><span>{formatTime(timeLeft)}</span></div>
                    )}
                </div>
                <div className="w-auto">
                    <StatusIndicator />
                </div>
            </CardFooter>
        </Card>
    );
}
