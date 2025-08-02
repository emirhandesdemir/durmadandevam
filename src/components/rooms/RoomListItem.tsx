// src/components/rooms/RoomListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Users, XCircle, Zap, Gift, Crown, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Button } from "../ui/button";

interface RoomListItemProps {
    room: Room;
}

const gradientClasses = [
    "from-pink-500 via-purple-500 to-indigo-500",
    "from-green-400 via-cyan-500 to-blue-600",
    "from-yellow-400 via-orange-500 to-red-500",
    "from-teal-400 via-blue-500 to-purple-600",
    "from-rose-400 via-fuchsia-500 to-indigo-500",
];

export default function RoomListItem({ room }: RoomListItemProps) {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    
    const gradientIndex = room.id.charCodeAt(0) % gradientClasses.length;
    const gradient = gradientClasses[gradientIndex];

    const participants = room.participants || [];
    const isFull = participants.length >= room.maxParticipants;
    const isParticipant = participants.some(p => p.uid === currentUser?.uid);
    const isExpired = room.expiresAt && (room.expiresAt as Timestamp).toDate() < new Date() && room.type !== 'event';

    const hasPortal = room.portalExpiresAt && (room.portalExpiresAt as Timestamp).toDate() > new Date();

    if (isExpired) {
        return null;
    }
    
    const isDisabled = (isFull && !isParticipant);

    const handleCardClick = () => {
        if (!isDisabled) {
            router.push(`/rooms/${room.id}`);
        }
    };
    
    return (
        <Card 
            onClick={handleCardClick} 
            className={cn(
                "group overflow-hidden transition-all duration-300 flex flex-col rounded-2xl shadow-lg relative text-white bg-gradient-to-br",
                gradient,
                isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-xl hover:-translate-y-1"
            )}
        >
             <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>

             <CardContent className="relative z-10 p-4 flex flex-col flex-1">
                <div className="flex-1 space-y-2">
                     <div className="flex justify-between items-start">
                        {room.type === 'event' ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-300/50">
                                <Gift className="h-3 w-3"/> ETKİNLİK
                            </div>
                        ) : hasPortal ? (
                             <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full bg-primary/20 text-primary-foreground border border-primary/50">
                                <Zap className="h-3 w-3"/> PORTAL AÇIK
                            </div>
                        ) : <div></div>}
                        
                         <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-black/30">
                            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                            CANLI
                        </div>
                    </div>

                    <p className="text-lg font-bold truncate pt-4">{room.name}</p>
                    <p className="text-xs opacity-80 line-clamp-2 min-h-[2.5rem]">{room.description}</p>
                </div>

                 <div className="flex items-center justify-between mt-4 border-t border-white/10 pt-3">
                    <div className="flex items-center -space-x-2">
                        {participants.slice(0, 3).map(p => (
                             <Avatar key={p.uid} className="h-7 w-7 border-2 border-black/30">
                                <AvatarImage src={p.photoURL || undefined} />
                                <AvatarFallback className="text-xs bg-black/20">{p.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                     <div className="flex items-center gap-1.5 text-xs opacity-80">
                        <Users className="h-4 w-4"/>
                        <span>{participants.length} / {room.maxParticipants}</span>
                    </div>
                 </div>
             </CardContent>
             <CardFooter className="relative z-10 p-2 bg-black/20">
                 <Button onClick={handleCardClick} variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white" disabled={isDisabled}>
                     {isDisabled ? (
                        <>
                            <XCircle className="mr-2 h-4 w-4" /> Oda Dolu
                        </>
                     ) : (
                        <>
                            Hemen Katıl <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                     )}
                 </Button>
             </CardFooter>
        </Card>
    );
}
