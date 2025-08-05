// src/components/rooms/RoomListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Users, XCircle, Zap, Gift, Crown, Info, Star, Reply } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import AvatarWithFrame from "../common/AvatarWithFrame";
import useLongPress from "@/hooks/useLongPress";
import { useState } from "react";
import RoomPreviewDialog from "./RoomPreviewDialog";
import { useVoiceChat } from "@/contexts/VoiceChatContext";

interface RoomListItemProps {
    room: Room;
}

const gradientClasses = [
    "from-pink-500/80 via-purple-500/80 to-indigo-500/80",
    "from-green-400/80 via-cyan-500/80 to-blue-600/80",
    "from-yellow-400/80 via-orange-500/80 to-red-500/80",
    "from-teal-400/80 via-blue-500/80 to-purple-600/80",
    "from-rose-400/80 via-fuchsia-500/80 to-indigo-500/80",
];

export default function RoomListItem({ room }: RoomListItemProps) {
    const { user: currentUser } = useAuth();
    const { activeRoom } = useVoiceChat();
    const router = useRouter();
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    // Her oda için ID'sine göre tutarlı bir gradyan seçimi yap
    const gradientIndex = room.id.charCodeAt(0) % gradientClasses.length;
    const gradient = gradientClasses[gradientIndex];

    const participants = room.participants || [];
    const isFull = participants.length >= room.maxParticipants;
    const isParticipant = participants.some(p => p.uid === currentUser?.uid);
    const isExpired = room.expiresAt && (room.expiresAt as Timestamp).toDate() < new Date() && room.type !== 'event';

    const hasPortal = room.portalExpiresAt && (room.portalExpiresAt as Timestamp).toMillis() > Date.now();
    const isInThisRoom = activeRoom?.id === room.id;

    if (isExpired) {
        return null;
    }
    
    const isDisabled = (isFull && !isParticipant);

    const handleCardClick = () => {
        if (!isDisabled) {
            router.push(`/rooms/${room.id}`);
        }
    };
    
    const longPressEvents = useLongPress(() => setIsPreviewOpen(true), handleCardClick);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full"
                {...longPressEvents}
            >
                <Card 
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
                                
                                <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full bg-black/20 text-yellow-300">
                                    <Star className="h-3 w-3 fill-current"/> SV {room.level || 0}
                                </div>
                            </div>

                            <p className="text-lg font-bold truncate pt-4">{room.name}</p>
                            <p className="text-xs opacity-80 line-clamp-2 min-h-[2.5rem]">{room.description}</p>
                        </div>

                        <div className="flex items-center justify-between mt-4 border-t border-white/10 pt-3">
                            <div className="flex items-center -space-x-2">
                                {participants.slice(0, 3).map(p => (
                                    <AvatarWithFrame 
                                        key={p.uid}
                                        photoURL={p.photoURL}
                                        className="h-7 w-7 border-2 border-black/30"
                                        fallbackClassName="text-xs bg-black/20"
                                        fallback={p.username?.charAt(0)}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs opacity-80">
                                <Users className="h-4 w-4"/>
                                <span>{participants.length} / {room.maxParticipants}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="relative z-10 p-2 bg-black/20">
                        <div className="w-full text-white text-center flex items-center justify-center">
                             {isDisabled ? (
                                <>
                                    <XCircle className="mr-2 h-4 w-4" /> Oda Dolu
                                </>
                             ) : isInThisRoom ? (
                                <>
                                    <Reply className="mr-2 h-4 w-4" /> Odaya Geri Dön
                                </>
                            ) : (
                                <>
                                    Hemen Katıl <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
             <RoomPreviewDialog 
                isOpen={isPreviewOpen} 
                onOpenChange={setIsPreviewOpen} 
                room={room} 
            />
        </>
    );
}
