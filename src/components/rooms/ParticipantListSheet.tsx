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
import { Virtuoso } from 'react-virtuoso';
import type { Room } from "@/lib/types";
import { Crown, Shield, MoreVertical, UserCog, UserX, Loader2, MicOff, DoorClosed, Ban, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "../ui/button";
import { useState } from "react";
import { updateModerators, kickFromRoom, banFromRoom, muteInRoom } from "@/lib/actions/roomActions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";


interface ParticipantListSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    room: Room;
}

export default function ParticipantListSheet({ isOpen, onOpenChange, room }: ParticipantListSheetProps) {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;
    const isAdmin = userData?.role === 'admin';
    const isCurrentUserModerator = room.moderators?.includes(user?.uid || '');
    const canManage = isHost || isAdmin || isCurrentUserModerator;

    const handleAction = async (action: 'mod' | 'unmod' | 'kick' | 'ban' | 'mute', targetUserId: string) => {
        if (!canManage) return;
        setProcessingId(targetUserId);
        try {
            switch(action) {
                case 'mod':
                    await updateModerators(room.id, targetUserId, 'add');
                    toast({ description: "Kullanıcı moderatör yapıldı." });
                    break;
                case 'unmod':
                     await updateModerators(room.id, targetUserId, 'remove');
                    toast({ description: "Kullanıcının moderatörlüğü alındı." });
                    break;
                case 'kick':
                    await kickFromRoom(room.id, targetUserId);
                    toast({ description: "Kullanıcı odadan atıldı." });
                    break;
                case 'ban':
                    await banFromRoom(room.id, targetUserId);
                    toast({ description: "Kullanıcının odaya girişi engellendi." });
                    break;
                 case 'mute':
                    await muteInRoom(room.id, targetUserId, true); // True to mute
                    toast({ description: "Kullanıcı sesli sohbette susturuldu." });
                    break;
            }
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        } finally {
            setProcessingId(null);
        }
    };
    
    const displayedParticipants = room.participants;
      
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
                        const isThisUserMe = p.uid === user?.uid;

                        let roleLabel = null;
                        if (isParticipantHost) {
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
                                {canManage && !isThisUserMe && !isParticipantHost && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={processingId === p.uid}>
                                                 {processingId === p.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-4 w-4" />}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                             <DropdownMenuItem onClick={() => router.push(`/profile/${p.uid}`)}>
                                                <User className="mr-2 h-4 w-4" />
                                                <span>Profili Gör</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Oda Yetkileri</DropdownMenuLabel>
                                            {isHost && (
                                                <DropdownMenuItem onClick={() => handleAction(isParticipantModerator ? 'unmod' : 'mod', p.uid)}>
                                                    {isParticipantModerator ? <UserX className="mr-2 h-4 w-4"/> : <UserCog className="mr-2 h-4 w-4"/> }
                                                    <span>{isParticipantModerator ? 'Moderatörlükten Al' : 'Moderatör Yap'}</span>
                                                </DropdownMenuItem>
                                            )}
                                             <DropdownMenuItem onClick={() => handleAction('mute', p.uid)}>
                                                <MicOff className="mr-2 h-4 w-4"/>
                                                <span>Sustur</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleAction('kick', p.uid)}>
                                                <DoorClosed className="mr-2 h-4 w-4"/>
                                                <span>Odadan At</span>
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => handleAction('ban', p.uid)} className="text-destructive focus:text-destructive">
                                                <Ban className="mr-2 h-4 w-4"/>
                                                <span>Girişi Engelle</span>
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
