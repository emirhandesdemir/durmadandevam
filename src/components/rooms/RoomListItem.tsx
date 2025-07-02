// src/components/rooms/RoomListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, Check, Loader2, Users, Clock, Zap, XCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { joinRoom } from "@/lib/actions/roomActions";
import { Timestamp } from "firebase/firestore";
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const hasPortal = room.portalExpiresAt && (room.portalExpiresAt as Timestamp).toDate() > new Date();

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

    const participants = room.participants || [];
    const isFull = participants.length >= room.maxParticipants;
    const isParticipant = participants.some(p => p.uid === currentUser?.uid);
    const isExpired = timeLeft === 0;

    const handleJoinClick = async () => {
        if (!currentUser) {
            toast({ title: "Giriş Gerekli", description: "Katılmak için giriş yapmalısınız.", variant: "destructive" });
            router.push('/login');
            return;
        }
        if (isFull || isJoining || isExpired) return;

        setIsJoining(true);
        try {
            await joinRoom(room.id, {
                uid: currentUser.uid,
                username: currentUser.displayName,
                photoURL: currentUser.photoURL,
            });
            toast({ title: "Başarılı!", description: `"${room.name}" topluluğuna katıldınız.` });
            router.push(`/rooms/${room.id}`);
        } catch (error: any) {
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };
    
    const handleEnterClick = () => {
        if (!isExpired) {
          router.push(`/rooms/${room.id}`);
        }
    }

    const actionToPerform = isParticipant ? handleEnterClick : handleJoinClick;
    const isDisabled = isJoining || (isFull && !isParticipant) || isExpired;

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Clicks on links or their children should not trigger the card's main action
        let target = e.target as HTMLElement;
        while (target && target !== e.currentTarget) {
            if (target.tagName === 'A' || target.hasAttribute('data-tooltip-trigger')) {
                return;
            }
            target = target.parentElement as HTMLElement;
        }
        
        if (!isDisabled) {
            actionToPerform();
        }
    };

    const StatusIndicator = () => {
        if (isJoining) {
            return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
        }
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
        if (isParticipant) {
             return (
                <TooltipProvider>
                    <Tooltip><TooltipTrigger><CheckCircle className="h-5 w-5 text-green-500" /></TooltipTrigger><TooltipContent><p>Odaya Gir</p></TooltipContent></Tooltip>
                </TooltipProvider>
            );
        }
        return (
            <TooltipProvider>
                <Tooltip><TooltipTrigger><LogIn className="h-5 w-5 text-primary" /></TooltipTrigger><TooltipContent><p>Hemen Katıl</p></TooltipContent></Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Card onClick={handleCardClick} className={cn(
            "group overflow-hidden transition-all duration-300 flex flex-col rounded-2xl shadow-lg border",
            hasPortal ? "border-primary/50 shadow-primary/10" : "border-border",
            isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-xl hover:-translate-y-1",
            isParticipant && !isDisabled && "hover:border-green-500/50"
        )}>
             {isExpired && (
                <div className="absolute inset-0 bg-background/80 z-20 flex items-center justify-center">
                    <p className="font-bold text-lg text-muted-foreground">Süresi Doldu</p>
                </div>
            )}
             {hasPortal && (
                <div className="absolute top-3 right-3 z-10">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="relative p-1.5 bg-background/50 backdrop-blur-sm rounded-full">
                                    <Zap className="h-5 w-5 text-primary"/>
                                    <div className="absolute inset-0 -z-10 animate-ping bg-primary blur-md rounded-full"></div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Bu odaya bir portal açık!</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}

            <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Image 
                    src={room.coverImage || `https://placehold.co/600x400/8b5cf6/ffffff?text=HiweWalk`}
                    data-ai-hint="HiweWalk logo"
                    alt={room.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                 <div className="absolute bottom-0 left-0 p-4 w-full">
                     <h3 className="font-bold text-lg text-white truncate">{room.name}</h3>
                     <p className="text-sm text-white/80 truncate">{room.description}</p>
                 </div>
            </div>

            <CardContent className="p-3">
                <div className="flex items-center justify-between">
                    <Link href={`/profile/${room.createdBy.uid}`} className="flex items-center gap-2 overflow-hidden">
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
                                    <TooltipTrigger data-tooltip-trigger>
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

            <CardFooter className="bg-card p-3 flex justify-between items-center text-sm mt-auto border-t">
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
