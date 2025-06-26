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
  updateSpeakerStatus,
} from "@/lib/actions/voiceActions";
import type { VoiceParticipant } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Crown,
  Mic,
  MicOff,
  User,
  Volume2,
  VolumeX,
  LogOut,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


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
  const [isProcessing, setIsProcessing] = useState(false);

  const isSelf = participant.uid === currentUserId;

  const handleAction = async (
    action: (
      roomId: string,
      currentUserId: string,
      targetUserId: string,
      param?: any
    ) => Promise<{ success: boolean; error?: string }>,
    param?: any
  ) => {
    setIsProcessing(true);
    try {
      const result = await action(roomId, currentUserId, participant.uid, param);
      if (!result.success) {
        toast({ variant: "destructive", description: result.error });
      }
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const menuContent = (
    <DropdownMenuContent align="center" className="bg-gray-800 border-gray-700 text-white">
      <DropdownMenuLabel>{participant.username}</DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-gray-700"/>
      {participant.isSpeaker ? (
        <DropdownMenuItem
          onClick={() => handleAction(updateSpeakerStatus, false)}
          className="focus:bg-gray-700"
        >
          <VolumeX className="mr-2 h-4 w-4" />
          <span>Dinleyici Yap</span>
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          onClick={() => handleAction(updateSpeakerStatus, true)}
          className="focus:bg-gray-700"
        >
          <Volume2 className="mr-2 h-4 w-4" />
          <span>Konuşmacı Yap</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator className="bg-gray-700"/>
      <DropdownMenuItem
        className="text-red-400 focus:text-red-400 focus:bg-red-900/50"
        onClick={() => handleAction(kickFromVoice)}
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Sesten At</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
  
  const avatarSize = size === 'lg' ? "h-24 w-24" : "h-16 w-16";
  const nameSize = size === 'lg' ? "text-sm" : "text-xs";
  const iconSize = size === 'lg' ? "h-5 w-5" : "h-4 w-4";
  const iconBadgePos = size === 'lg' ? "bottom-2 right-2" : "bottom-1 right-1";

  const avatar = (
    <div className="relative flex flex-col items-center gap-2">
      <Avatar
        className={cn(
          "border-2 transition-all duration-300",
          avatarSize,
          participant.isSpeaker && !participant.isMuted
            ? "border-green-500 shadow-lg shadow-green-500/50 animate-pulse"
            : "border-transparent"
        )}
      >
        <AvatarImage src={participant.photoURL || undefined} />
        <AvatarFallback className="bg-gray-700 text-gray-300">
          {participant.username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
       <div className={cn("absolute bg-gray-800 p-1.5 rounded-full shadow-md", iconBadgePos)}>
        {participant.isMuted ? (
          <MicOff className={cn(iconSize, "text-red-500")} />
        ) : (
          <Mic className={cn(iconSize, "text-white")} />
        )}
      </div>
      <div className="flex items-center justify-center gap-1.5">
          <p className={cn("font-semibold text-white truncate", nameSize, size === 'lg' ? 'max-w-[120px]' : 'max-w-[80px]')}>{participant.username}</p>
          {isParticipantTheHost && (
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger>
                          <Crown className={cn("text-yellow-400", size === 'lg' ? 'h-5 w-5' : 'h-4 w-4' )} />
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

  // Eğer kullanıcı yöneticiyse ve bu ikon başkasına aitse, menüyü göster
  if (isHost && !isSelf) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isProcessing}
            className="cursor-pointer rounded-full text-center"
          >
            {isProcessing ? (
              <div className={cn("flex items-center justify-center rounded-full bg-gray-800/50", avatarSize)}>
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

  // Yönetici olmayanlar veya kendi ikonu için sadece avatarı göster
  return avatar;
}
