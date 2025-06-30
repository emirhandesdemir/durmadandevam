// src/components/rooms/RoomHeader.tsx
"use client";

import { useState } from 'react';
import { ChevronLeft, MoreHorizontal, Users, UserPlus, Gift, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/types';
import InviteDialog from './InviteDialog';
import OpenPortalDialog from './OpenPortalDialog';
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
  isSpeakerLayoutCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function RoomHeader({ room, isHost, onParticipantListToggle, onBackClick, isSpeakerLayoutCollapsed, onToggleCollapse }: RoomHeaderProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isPortalDialogOpen, setIsPortalDialogOpen] = useState(false);

    return (
        <>
            <header className="flex items-center justify-between p-3 border-b shrink-0 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                    <Button onClick={onBackClick} variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft />
                    </Button>
                    
                    {isHost && (
                         <div className="relative">
                            <Button onClick={() => setIsPortalDialogOpen(true)} variant="ghost" size="icon" className="rounded-full text-yellow-400 hover:text-yellow-300 animate-pulse">
                                <Zap className="h-5 w-5" />
                            </Button>
                             <div className="absolute inset-0 -z-10 bg-yellow-400/50 blur-lg animate-pulse rounded-full"></div>
                        </div>
                    )}

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
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onToggleCollapse}>
                       {isSpeakerLayoutCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
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
            <OpenPortalDialog
                isOpen={isPortalDialogOpen}
                onOpenChange={setIsPortalDialogOpen}
                roomId={room.id}
                roomName={room.name}
            />
        </>
    );
}
