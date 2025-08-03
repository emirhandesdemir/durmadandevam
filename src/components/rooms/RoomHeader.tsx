// src/components/rooms/RoomHeader.tsx
"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, MoreHorizontal, Users, UserPlus, Gift, Zap, ChevronUp, ChevronDown, Clock, LogOut, MicOff, Minimize2, Settings, Star, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/types';
import InviteDialog from './InviteDialog';
import OpenPortalDialog from './OpenPortalDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Timestamp } from 'firebase/firestore';
import { addSystemMessage } from '@/lib/actions/roomActions';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { useRouter } from 'next/navigation';
import RoomManagementDialog from './RoomManagementDialog';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface RoomHeaderProps {
  room: Room;
  isHost: boolean;
  onParticipantListToggle: () => void;
  isSpeakerLayoutCollapsed: boolean;
  onToggleCollapse: () => void;
}

const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function RoomHeader({ room, isHost, onParticipantListToggle, isSpeakerLayoutCollapsed, onToggleCollapse }: RoomHeaderProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isPortalDialogOpen, setIsPortalDialogOpen] = useState(false);
    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [warningSent, setWarningSent] = useState(false);
    const { leaveRoom } = useVoiceChat();
    const router = useRouter();
    const { toast } = useToast();


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

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: room.name,
                text: `Seni "${room.name}" odasına davet ediyorum!`,
                url: window.location.href,
            })
            .then(() => console.log('Successful share'))
            .catch((error) => console.log('Error sharing', error));
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link Kopyalandı",
                description: "Oda davet linki panoya kopyalandı.",
            });
        }
    };


    return (
        <>
            <header className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/50 to-transparent text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-white/10" onClick={() => router.back()}>
                          <ChevronLeft />
                        </Button>
                        <div>
                            <h1 className="font-bold text-sm truncate">{room.name}</h1>
                            <p className="text-xs opacity-70">ID: {room.id}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={onParticipantListToggle}>
                           <Users className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={handleShare}>
                           <Share2 className="h-5 w-5" />
                        </Button>
                         <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={leaveRoom}>
                           <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                 <div className="flex items-center justify-between mt-3 px-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className='flex items-center gap-2 cursor-pointer bg-black/30 p-1.5 pr-3 rounded-full'>
                                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    <span className='font-bold text-sm'>SV {room.level || 0}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex flex-col gap-1 text-center">
                                    <p className="font-semibold">Seviye İlerlemesi</p>
                                    <Progress value={(room.xp / room.xpToNextLevel) * 100} className="h-1.5 w-24" />
                                    <p className="text-xs">{room.xp} / {room.xpToNextLevel} XP</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {isHost && (
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={() => setIsManagementOpen(true)}>
                           <Settings className="h-5 w-5" />
                        </Button>
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
             <RoomManagementDialog 
                isOpen={isManagementOpen}
                setIsOpen={setIsManagementOpen}
                room={room}
            />
        </>
    );
}
