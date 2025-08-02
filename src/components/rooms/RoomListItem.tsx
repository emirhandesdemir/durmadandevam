// src/components/rooms/RoomListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Clock, Users, XCircle, Zap, Gift, Crown } from "lucide-react";
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

const gradientClasses = [
    "from-pink-500 to-purple-600",
    "from-green-400 to-blue-500",
    "from-yellow-400 to-orange-500",
    "from-indigo-500 to-purple-500",
    "from-red-500 to-yellow-500",
];


export default function RoomListItem({ room }: RoomListItemProps) {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    
    // Assign a consistent gradient based on room ID
    const gradientIndex = room.id.charCodeAt(0) % gradientClasses.length;
    const gradient = gradientClasses[gradientIndex];

    const participants = room.participants || [];
    const isFull = participants.length >= room.maxParticipants;
    const isParticipant = participants.some(p => p.uid === currentUser?.uid);
    const isExpired = room.expiresAt && (room.expiresAt as Timestamp).toDate() < new Date() && room.type !== 'event';


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
                <div className="flex-1">
                    <p className="text-lg font-bold truncate">{room.name}</p>
                    <div className="flex items-center gap-1.5 text-xs opacity-80">
                        <Users className="h-4 w-4"/>
                        <span>{participants.length} / {room.maxParticipants}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Avatar className="h-6 w-6 border-2 border-white/50">
                            <AvatarImage src={room.createdBy.photoURL || undefined} />
                            <AvatarFallback className="text-xs bg-black/20">{room.createdBy.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold truncate">{room.createdBy.username}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-black/20">
                        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                        Live
                    </div>
                </div>

             </CardContent>
        </Card>
    );
}
