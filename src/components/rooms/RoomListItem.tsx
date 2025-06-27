// src/components/rooms/RoomListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogIn, Check, Loader2, Users, Crown, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { joinRoom } from "@/lib/actions/roomActions";
import { Timestamp } from "firebase/firestore";
import { Badge } from "../ui/badge";

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
            toast({ title: "Giriş Gerekli", description: "Odaya katılmak için giriş yapmalısınız.", variant: "destructive" });
            router.push('/login');
            return;
        }
        if (isFull || isJoining || isExpired) return;

        setIsJoining(true);
        try {
            await joinRoom(room.id, {
                uid: currentUser.uid,
                username: currentUser.displayName,
                photoURL: currentUser.photoURL
            });
            toast({ title: "Başarılı!", description: `"${room.name}" odasına katıldınız.` });
            router.push(`/rooms/${room.id}`);
        } catch (error: any) {
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };
    
    const handleEnterClick = () => {
        router.push(`/rooms/${room.id}`);
    }

    return (
        <div className="flex items-center gap-4 p-3 rounded-2xl bg-card hover:bg-muted/50 transition-colors">
            <div className="relative">
                <Avatar className="h-12 w-12 border">
                    <AvatarImage src={room.createdBy.photoURL || undefined} />
                    <AvatarFallback>{room.createdBy.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                 <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full">
                    <Crown className="h-4 w-4 text-yellow-500"/>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate">{room.name}</p>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground truncate">{room.description}</p>
                    {timeLeft !== null && !isExpired && (
                        <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatTime(timeLeft)}
                        </Badge>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Users className="h-4 w-4"/>
                <span>{participants.length} / {room.maxParticipants}</span>
            </div>
            {isParticipant ? (
                 <Button variant="ghost" size="sm" onClick={handleEnterClick} disabled={isExpired}>
                    {isExpired ? "Süresi Doldu" : <><Check className="mr-2 h-4 w-4" /> Gir</>}
                </Button>
            ) : (
                <Button 
                  onClick={handleJoinClick} 
                  disabled={isJoining || isFull || isExpired}
                  size="sm"
                >
                    {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    {isExpired ? 'Süresi Doldu' : (isFull ? 'Dolu' : 'Katıl')}
                </Button>
            )}
        </div>
    );
}
