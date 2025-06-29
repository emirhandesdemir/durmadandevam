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
import { Crown, Shield, MoreVertical, UserCog, UserX, Loader2, Hand, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Button } from "../ui/button";
import { useState } from "react";
import { updateModerators, manageSpeakingPermission } from "@/lib/actions/roomActions";
import { useToast } from "@/hooks/use-toast";
import { useVoiceChat } from "@/contexts/VoiceChatContext";


interface ParticipantListSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    room: Room;
}

export default function ParticipantListSheet({ isOpen, onOpenChange, room }: ParticipantListSheetProps) {
    const { user } = useAuth();
    const { participants: voiceParticipants } = useVoiceChat();
    const { toast } = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const isHost = user?.uid === room?.createdBy.uid;

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

    const handlePermission = async (targetUserId: string, allow: boolean) => {
        if (!user) return;
        setProcessingId(targetUserId);
        try {
            await manageSpeakingPermission(room.id, user.uid, targetUserId, allow);
             toast({ description: `Kullanıcıya konuşma izni ${allow ? 'verildi' : 'kaldırıldı'}.`})
        } catch (e: any) {
            toast({ variant: "destructive", description: e.message });
        } finally {
            setProcessingId(null);
        }
    }
    
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col bg-card border-l">
                <SheetHeader className="text-left">
                    <SheetTitle>Katılımcılar ({room?.participants?.length || 0})</SheetTitle>
                    <SheetDescription>
                        Bu odada bulunan tüm kullanıcılar.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4 py-4">
                        {room?.participants?.map(p => {
                            const isParticipantHost = p.uid === room.createdBy.uid;
                            const isParticipantModerator = room.moderators?.includes(p.uid);
                            const voiceInfo = voiceParticipants.find(vp => vp.uid === p.uid);

                            return (
                                <div key={p.uid} className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar>
                                            <AvatarImage src={p.photoURL || undefined} />
                                            <AvatarFallback>{p.username.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {voiceInfo?.handRaised && (
                                             <div className="absolute -top-1 -right-1 p-0.5 bg-blue-500 rounded-full border border-background">
                                                <Hand className="h-3 w-3 text-white" />
                                             </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-foreground">{p.username}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                           {isParticipantHost && <><Crown className="h-3 w-3 text-yellow-500" /><span>Oda Sahibi</span></>}
                                           {isParticipantModerator && !isParticipantHost && <><Shield className="h-3 w-3 text-blue-500" /><span>Moderatör</span></>}
                                        </div>
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
                                                {voiceInfo?.handRaised && !voiceInfo.canSpeak && (
                                                    <DropdownMenuItem onClick={() => handlePermission(p.uid, true)} className="text-green-500 focus:text-green-500">
                                                        <Check className="mr-2 h-4 w-4" />
                                                        <span>Konuşma İzni Ver</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
