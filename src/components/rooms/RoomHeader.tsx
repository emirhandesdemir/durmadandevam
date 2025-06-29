// src/components/rooms/RoomHeader.tsx
"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, MoreHorizontal, Users, Timer, AlertTriangle, UserPlus, Gamepad2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/types';
import { cn } from '@/lib/utils';
import { addSystemMessage, deleteExpiredRoom } from '@/lib/actions/roomActions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import InviteDialog from './InviteDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RoomHeaderProps {
  room: Room;
  isHost: boolean;
  onParticipantListToggle: () => void;
  onBackClick: () => void;
  onStartGameClick: () => void;
}

export default function RoomHeader({ room, isHost, onParticipantListToggle, onBackClick, onStartGameClick }: RoomHeaderProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    return (
        <>
            <header className="flex items-center justify-between p-3 border-b shrink-0 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                    <Button onClick={onBackClick} variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft />
                    </Button>
                    <div>
                        <h1 className="text-md font-bold truncate max-w-[120px] sm:max-w-[180px]">{room.name}</h1>
                        <p className="text-xs text-muted-foreground">ID: {room.id.substring(0, 10)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                     <Button variant="ghost" size="icon" className="rounded-full">
                        <Gift className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onParticipantListToggle}>
                        <Users className="h-5 w-5" />
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
                                <DropdownMenuItem onClick={onStartGameClick}>
                                    <Gamepad2 className="mr-2 h-4 w-4"/>
                                    Oyun Başlat
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
        </>
    );
}
