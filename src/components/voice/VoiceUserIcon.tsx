// src/components/voice/VoiceUserIcon.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { kickFromVoice } from "@/lib/actions/roomActions";
import type { VoiceParticipant, Room } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Crown,
  Mic,
  MicOff,
  LogOut,
  Loader2,
  User,
  Shield,
  BadgeCheck,
  Star
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { useVoiceChat } from "@/contexts/VoiceChatContext";
import { Badge } from "../ui/badge";

interface VoiceUserIconProps {
  participant: VoiceParticipant;
  room: Room;
  isHost: boolean;
  isModerator: boolean;
  currentUserId: string;
  size?: 'sm' | 'lg';
}

export default function VoiceUserIcon({
  participant,
  room,
  isHost,
  isModerator,
  currentUserId,
  size = 'sm',
}: VoiceUserIconProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const { self } = useVoiceChat();

  const isSelf = participant.uid === currentUserId;
  const isParticipantHost = participant.uid === room.createdBy.uid;
  const isParticipantModerator = room.moderators?.includes(participant.uid);
  const isParticipantAdmin = participant.role === 'admin';

  const canModerate = isHost || isModerator;

  const handleKick = async () => {
    if (!canModerate) return;
    setIsProcessing(true);
    try {
      await kickFromVoice(room.id, currentUserId, participant.uid);
      toast({ description: `${participant.username} sesten atıldı.`})
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleViewProfile = () => {
      router.push(`/profile/${participant.uniqueTag}`);
  }

  const menuContent = (
    <DropdownMenuContent align="center" className="bg-card border">
      <DropdownMenuLabel>{participant.username}</DropdownMenuLabel>
      <DropdownMenuSeparator/>
       <DropdownMenuItem onClick={handleViewProfile}>
          <User className="mr-2 h-4 w-4" />
          <span>Profili Görüntüle</span>
      </DropdownMenuItem>
      {canModerate && !isSelf && !isParticipantHost && (
        <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleKick}
            >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sesten At</span>
            </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );
  
  const nameSize = size === 'lg' ? "text-base" : "text-xs";
  const avatarSize = size === 'lg' ? "h-24 w-24" : "w-full aspect-square";
  const fallbackTextSize = size === 'lg' ? "text-4xl" : "text-xl";
  const iconBadgePos = size === 'lg' ? "bottom-1 right-1 p-2" : "bottom-0 right-0 p-1.5";
  const iconSize = size === 'lg' ? "h-5 w-5" : "h-4 w-4";
  
  const isSpeaking = participant.isSpeaking;
  
  const avatarContent = (
    <div className={cn("relative z-[1] border-2 transition-all duration-300 w-full h-full rounded-full overflow-hidden",
        isSpeaking && !participant.isMuted ? "border-green-500 shadow-lg shadow-green-500/50 ring-4 ring-green-500/30" : "border-transparent",
    )}>
        <Avatar className="w-full h-full">
            <AvatarImage src={participant.photoURL || undefined} />
            <AvatarFallback className={cn("bg-muted text-muted-foreground", fallbackTextSize)}>
            {participant.profileEmoji || participant.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    </div>
  );


  const avatar = (
    <div className="relative flex flex-col items-center gap-2">
       <div className={cn("relative", avatarSize)}>
           <div className={cn("avatar-frame-wrapper w-full h-full", participant.selectedAvatarFrame)}>
              {avatarContent}
          </div>
          <div className={cn("absolute bg-card/70 backdrop-blur-sm rounded-full shadow-md z-10 flex items-center gap-1.5", iconBadgePos)}>
            {participant.isMuted ? (
              <MicOff className={cn(iconSize, "text-destructive")} />
            ) : (
              <Mic className={cn(iconSize, "text-foreground")} />
            )}
          </div>
      </div>

       <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-center gap-1.5 w-full">
                <p className={cn("font-bold truncate transition-colors", nameSize, isSpeaking && !participant.isMuted ? 'text-green-400' : 'text-foreground', size === 'lg' ? 'max-w-[120px]' : 'max-w-[60px]')}>{participant.username}</p>
                 {isParticipantAdmin ? (
                       <TooltipProvider delayDuration={0}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <BadgeCheck className={cn("text-primary shrink-0", iconSize)} />
                              </TooltipTrigger>
                              <TooltipContent><p>Yönetici</p></TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  ) : isParticipantHost && size === 'sm' ? (
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <Crown className={cn("text-yellow-400 shrink-0", iconSize)} />
                          </TooltipTrigger>
                          <TooltipContent><p>Oda Sahibi</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : isParticipantModerator && !isParticipantHost && size === 'sm' ? (
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <Shield className={cn("text-blue-400 shrink-0", iconSize)} />
                          </TooltipTrigger>
                          <TooltipContent><p>Moderatör</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : null}
            </div>
            {participant.giftLevel > 0 && (
                 <Badge variant="destructive" className="h-4">
                    <Star className="h-3 w-3 mr-1"/> SV {participant.giftLevel}
                </Badge>
            )}
       </div>
    </div>
  );

  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isProcessing}
            className="cursor-pointer rounded-full text-center"
          >
            {isProcessing ? (
              <div className={cn("flex items-center justify-center rounded-full bg-muted/50", avatarSize)}>
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              avatar
            )}
          </button>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    );
}
