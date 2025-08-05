// src/components/rooms/ParticipantListSheet.tsx
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import type { Room } from "@/lib/types";
import { Crown, Shield, MoreVertical, UserCog, UserX, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "../ui/button";
import { useState } from "react";
import { updateModerators } from "@/lib/actions/roomActions";
import { useToast } from "@/hooks/use-toast";
import { Virtuoso } from 'react-virtuoso';


interface ParticipantListSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    room: Room;
}

export default function ParticipantListSheet({ isOpen, onOpenChange, room }: ParticipantListSheetProps) {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;
    const isAdmin = userData?.role === 'admin';
    const isCurrentUserAdmin = isHost || room.moderators?.includes(user?.uid || '') || isAdmin;

    const handleModeratorToggle = async (targetUserId: string, isCurrentlyModerator: boolean) => {
        if (!isHost) return;
        setProcessingId(targetUserId);
        try {
            await updateModerators(room.id, targetUserId, isCurrentlyModerator ? 'remove' : 'add');
            toast({ description: `Kullanıcı ${isCurrentlyModerator ? 'moderatörlükten alındı' : 'moderatör yapıldı'}.`})
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        } finally {
            setProcessingId(null);
        }
    }
    
    // Filter participants based on room type and user role
    const displayedParticipants = room.type === 'event' && !isCurrentUserAdmin
      ? room.participants.filter(p => p.uid === room.createdBy.uid || room.moderators.includes(p.uid))
      : room.participants;
      
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col bg-card border-l p-0">
                <SheetHeader className="text-left p-6 pb-2">
                    <SheetTitle>Katılımcılar ({room?.participants?.length || 0})</SheetTitle>
                    <SheetDescription>
                        Bu odada bulunan tüm kullanıcılar.
                    </SheetDescription>
                </SheetHeader>
                 <Virtuoso
                    style={{ height: '100%' }}
                    data={displayedParticipants}
                    itemContent={(index, p) => {
                       const isParticipantHost = p.uid === room.createdBy.uid;
                        const isParticipantModerator = room.moderators?.includes(p.uid);
                        const isParticipantAdminRole = room.createdBy.role === 'admin' && p.uid === room.createdBy.uid;
                        
                        let roleLabel = null;
                        if (isParticipantAdminRole || (room.type === 'event' && isParticipantHost)) {
                            roleLabel = <><Shield className="h-3 w-3 text-destructive" /><span>Yönetici</span></>;
                        } else if (isParticipantHost) {
                            roleLabel = <><Crown className="h-3 w-3 text-yellow-500" /><span>Oda Sahibi</span></>;
                        } else if (isParticipantModerator) {
                            roleLabel = <><Shield className="h-3 w-3 text-blue-500" /><span>Moderatör</span></>;
                        }

                        return (
                             <div key={p.uid} className="flex items-center gap-4 px-6 py-2">
                                <Avatar>
                                    <AvatarImage src={p.photoURL || undefined} />
                                    <AvatarFallback>{p.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-medium text-foreground">{p.username}</p>
                                    {roleLabel && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            {roleLabel}
                                        </div>
                                    )}
                                </div>
                                {isHost && !isParticipantHost && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={processingId === p.uid}>
                                                 {processingId === p.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-4 w-4" />}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleModeratorToggle(p.uid, !!isParticipantModerator)}>
                                                {isParticipantModerator ? <UserX className="mr-2 h-4 w-4"/> : <UserCog className="mr-2 h-4 w-4"/> }
                                                <span>{isParticipantModerator ? 'Moderatörlükten Al' : 'Moderatör Yap'}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        )
                    }}
                />
            </SheetContent>
        </Sheet>
    )
}
