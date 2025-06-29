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
import { kickFromVoice, manageSpeakingPermission } from "@/lib/actions/voiceActions";
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
  Hand,
  Check,
} from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { useVoiceChat } from "@/contexts/VoiceChatContext";


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
  const { handleManageSpeakingPermission } = useVoiceChat();
  const [isProcessing, setIsProcessing] = useState(false);

  const isSelf = participant.uid === currentUserId;
  const isParticipantHost = participant.uid === room.createdBy.uid;
  const isParticipantModerator = room.moderators?.includes(participant.uid);

  const canModerate = isHost || isModerator;

  const handleKick = async () => {
    if (!canModerate) return;
    setIsProcessing(true);
    try {
      const result = await kickFromVoice(room.id, currentUserId, participant.uid);
      if (!result.success) {
        toast({ variant: "destructive", description: result.error });
      }
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handlePermission = async (allow: boolean) => {
    if (!canModerate) return;
    setIsProcessing(true);
    try {
        await handleManageSpeakingPermission(participant.uid, allow);
    } catch (e: any) {
        toast({ variant: "destructive", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleViewProfile = () => {
      router.push(`/profile/${participant.uid}`);
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
            <DropdownMenuSeparator/>
            {participant.handRaised && !participant.canSpeak && (
                <DropdownMenuItem onClick={() => handlePermission(true)} className="text-green-500 focus:text-green-500">
                    <Check className="mr-2 h-4 w-4" />
                    <span>Konuşma İzni Ver</span>
                </DropdownMenuItem>
            )}
             {participant.canSpeak && (
                <DropdownMenuItem onClick={() => handlePermission(false)} className="text-amber-500 focus:text-amber-500">
                    <MicOff className="mr-2 h-4 w-4" />
                    <span>Sessize Al & İzni Kaldır</span>
                </DropdownMenuItem>
            )}
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
  
  const nameSize = size === 'lg' ? "text-sm" : "text-xs";
  const iconSize = size === 'lg' ? "h-5 w-5" : "h-4 w-4";
  const avatarSize = size === 'lg' ? "h-20 w-20" : "w-full aspect-square";
  const iconBadgePos = size === 'lg' ? "bottom-1 right-1 p-2" : "bottom-0 right-0 p-1.5";
  const speakingRing = participant.isSpeaker && !participant.isMuted;

  const avatar = (
    <div className="relative flex flex-col items-center gap-1.5">
       <div className={cn("relative", avatarSize)}>
          {participant.selectedBubble && (
            <div className={`bubble-wrapper ${participant.selectedBubble}`}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}
            </div>
          )}
           <div className={cn("avatar-frame-wrapper w-full h-full", participant.selectedAvatarFrame)}>
              <Avatar
                className={cn(
                  "relative z-[1] border-2 transition-all duration-300 w-full h-full",
                  speakingRing
                    ? "border-green-500 shadow-lg shadow-green-500/50 ring-4 ring-green-500/30"
                    : "border-transparent",
                )}
              >
                <AvatarImage src={participant.photoURL || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {participant.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
          </div>
            <div className={cn("absolute bg-card/70 backdrop-blur-sm rounded-full shadow-md", iconBadgePos)}>
                {participant.isMuted ? (
                <MicOff className={cn(iconSize, "text-destructive")} />
                ) : (
                <Mic className={cn(iconSize, "text-foreground")} />
                )}
            </div>
            {participant.handRaised && (
                 <div className="absolute top-0 -right-1 p-1 bg-blue-500 rounded-full border-2 border-background">
                    <Hand className="h-3 w-3 text-white" />
                 </div>
            )}
      </div>

      <div className="flex items-center justify-center gap-1 w-full">
          <p className={cn("font-semibold text-foreground truncate", nameSize, size === 'lg' ? 'max-w-[120px]' : 'max-w-[60px]')}>{participant.username}</p>
          {isParticipantHost && (
              <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Crown className={cn("text-yellow-400 shrink-0", size === 'lg' ? 'h-5 w-5' : 'h-4 w-4' )} />
                    </TooltipTrigger>
                    <TooltipContent><p>Oda Sahibi</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          )}
          {isParticipantModerator && !isParticipantHost && (
              <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Shield className={cn("text-blue-400 shrink-0", size === 'lg' ? 'h-5 w-5' : 'h-4 w-4' )} />
                    </TooltipTrigger>
                    <TooltipContent><p>Moderatör</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
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
              <div className={cn("flex items-center justify-center rounded-full bg-muted/50 aspect-square", avatarSize)}>
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
