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
            <header className="flex items-center justify-between border-b p-3 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
                    <ChevronLeft />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg leading-tight">{room.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <button onClick={onParticipantListToggle} className="hover:underline flex items-center gap-1"><Users className="h-3 w-3" />{room.participants?.length || 0} Katılımcı</button>
                            {timeLeft !== null && room.type !== 'event' && (
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.ceil(timeLeft / 60)} dk kaldı</span>
                            )}
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className='flex items-center gap-1 cursor-pointer'>
                                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                            <span>SV {room.level || 0}</span>
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
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onToggleCollapse}>
                        {isSpeakerLayoutCollapsed ? <ChevronDown /> : <ChevronUp />}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setIsInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Davet Et</DropdownMenuItem>
                             <DropdownMenuItem onSelect={handleShare}><Share2 className="mr-2 h-4 w-4" /> Paylaş</DropdownMenuItem>
                            {isHost && (
                                <>
                                 <DropdownMenuItem onSelect={() => setIsManagementOpen(true)}><Settings className="mr-2 h-4 w-4" /> Odanı Yönet</DropdownMenuItem>
                                 <DropdownMenuItem onSelect={() => setIsPortalDialogOpen(true)} className="text-primary focus:text-primary"><Zap className="mr-2 h-4 w-4"/> Portal Aç</DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={leaveRoom}><LogOut className="mr-2 h-4 w-4"/> Sesten Ayrıl</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
