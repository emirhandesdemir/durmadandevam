// src/components/rooms/RoomListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogIn, Check, Loader2, Users, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { joinRoom } from "@/lib/actions/roomActions";
import { Timestamp } from "firebase/firestore";
import Link from 'next/link';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
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

    const ActionButton = () => {
      if (isParticipant) {
        return (
          <Button variant="secondary" className="w-full" onClick={handleEnterClick} disabled={isExpired}>
            <Check className="mr-2 h-4 w-4" /> Odaya Gir
          </Button>
        );
      }
      return (
        <Button onClick={handleJoinClick} disabled={isJoining || isFull || isExpired} className="w-full">
          {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          {isExpired ? 'Süresi Doldu' : (isFull ? 'Oda Dolu' : 'Hemen Katıl')}
        </Button>
      );
    }

    return (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-300 flex flex-col",
            hasPortal ? "bg-gradient-to-tr from-primary/10 via-card to-card border-primary/20" : "bg-card",
            isExpired && "bg-muted/50"
        )}>
            {isExpired && (
                <div className="absolute inset-0 bg-background/80 z-20 flex items-center justify-center">
                    <p className="font-bold text-lg text-muted-foreground">Süresi Doldu</p>
                </div>
            )}
            
            {hasPortal && (
                <div className="absolute top-2 right-2 z-10">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <div className="relative">
                                    <Zap className="h-5 w-5 text-primary"/>
                                    <div className="absolute inset-0 -z-10 animate-ping bg-primary blur-md rounded-full"></div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Bu odaya bir portal açık!</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}
            <div className="flex-1">
                <CardHeader className="flex-row items-start gap-4 space-y-0 p-4">
                    <Link href={`/profile/${room.createdBy.uid}`} className="flex-shrink-0">
                        <div className={cn("avatar-frame-wrapper", room.createdBy.selectedAvatarFrame)}>
                            <Avatar className="relative z-[1] h-10 w-10 border">
                                <AvatarImage src={room.createdBy.photoURL || undefined} />
                                <AvatarFallback>{room.createdBy.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </Link>
                    <div className="flex-1">
                        <CardTitle className="text-base truncate">{room.name}</CardTitle>
                        <CardDescription className="truncate">{room.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="flex -space-x-2 overflow-hidden">
                        {participants.slice(0, 5).map(p => (
                            <TooltipProvider key={p.uid}>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Avatar className="h-8 w-8 border-2 border-background">
                                            <AvatarImage src={p.photoURL || undefined} />
                                            <AvatarFallback>{p.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{p.username}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                        {participants.length > 5 && (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground border-2 border-background">
                                +{participants.length - 5}
                            </div>
                        )}
                    </div>
                </CardContent>
            </div>
            <CardFooter className="bg-muted/50 p-2 flex justify-between items-center text-sm mt-auto">
                <div className="flex items-center gap-4 text-muted-foreground px-2">
                    <div className="flex items-center gap-1.5"><Users className="h-4 w-4"/><span>{participants.length} / {room.maxParticipants}</span></div>
                    {timeLeft !== null && !isExpired && (
                        <div className="flex items-center gap-1.5"><Clock className="h-4 w-4"/><span>{formatTime(timeLeft)}</span></div>
                    )}
                </div>
                <div className="w-1/3">
                    <ActionButton />
                </div>
            </CardFooter>
        </Card>
    );
}
