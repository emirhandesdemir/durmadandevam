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
import {
  kickFromVoice,
} from "@/lib/actions/voiceActions";
import type { VoiceParticipant } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Crown,
  Mic,
  MicOff,
  LogOut,
  Loader2,
  User,
} from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";


interface VoiceUserIconProps {
  participant: VoiceParticipant;
  isHost: boolean;
  currentUserId: string;
  roomId: string;
  size?: 'sm' | 'lg';
  isParticipantTheHost: boolean;
}

/**
 * Sesli sohbetteki tek bir kullanıcıyı temsil eden ikon.
 * Avatar, konuşma durumu ve yönetici yetkilerini içerir.
 */
export default function VoiceUserIcon({
  participant,
  isHost,
  currentUserId,
  roomId,
  size = 'sm',
  isParticipantTheHost,
}: VoiceUserIconProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const isSelf = participant.uid === currentUserId;

  const handleAction = async (
    action: (
      roomId: string,
      currentUserId: string,
      targetUserId: string
    ) => Promise<{ success: boolean; error?: string }>
  ) => {
    setIsProcessing(true);
    try {
      const result = await action(roomId, currentUserId, participant.uid);
      if (!result.success) {
        toast({ variant: "destructive", description: result.error });
      }
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleViewProfile = () => {
      router.push(`/profile/${participant.uid}`);
  }

  const menuContent = (
    <DropdownMenuContent align="center" className="bg-gray-800 border-gray-700 text-white">
      <DropdownMenuLabel>{participant.username}</DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-gray-700"/>
       <DropdownMenuItem onClick={handleViewProfile}>
          <User className="mr-2 h-4 w-4" />
          <span>Profili Görüntüle</span>
      </DropdownMenuItem>
      {isHost && !isSelf && (
        <DropdownMenuItem
          className="text-red-400 focus:text-red-400 focus:bg-red-900/50"
          onClick={() => handleAction(kickFromVoice)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sesten At</span>
        </DropdownMenuItem>
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
       <div className={cn(
          "relative", 
          avatarSize
        )}>
          {participant.selectedBubble && (
            <div className={`bubble-wrapper ${participant.selectedBubble}`}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}
            </div>
          )}
          <Avatar
            className={cn(
              "border-2 transition-all duration-300 w-full h-full",
              speakingRing
                ? "border-green-500 shadow-lg shadow-green-500/50 ring-4 ring-green-500/30"
                : "border-transparent",
            )}
          >
            <AvatarImage src={participant.photoURL || undefined} />
            <AvatarFallback className="bg-gray-700 text-gray-300">
              {participant.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={cn("absolute bg-gray-900/70 backdrop-blur-sm rounded-full shadow-md", iconBadgePos)}>
            {participant.isMuted ? (
              <MicOff className={cn(iconSize, "text-red-500")} />
            ) : (
              <Mic className={cn(iconSize, "text-white")} />
            )}
          </div>
      </div>

      <div className="flex items-center justify-center gap-1 w-full">
          <p className={cn("font-semibold text-white truncate", nameSize, size === 'lg' ? 'max-w-[120px]' : 'max-w-[60px]')}>{participant.username}</p>
          {isParticipantTheHost && (
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger>
                          <Crown className={cn("text-yellow-400 shrink-0", size === 'lg' ? 'h-5 w-5' : 'h-4 w-4' )} />
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>Oda Sahibi</p>
                      </TooltipContent>
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
              <div className={cn("flex items-center justify-center rounded-full bg-gray-800/50 aspect-square", avatarSize)}>
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
