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
  Mic,
  MicOff,
  User,
  Volume2,
  VolumeX,
  LogOut,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface VoiceUserIconProps {
  participant: VoiceParticipant;
  isHost: boolean;
  currentUserId: string;
  roomId: string;
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
    <DropdownMenuContent align="center">
      <DropdownMenuLabel>{participant.username}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {participant.isSpeaker ? (
        <DropdownMenuItem
          onClick={() => handleAction(updateSpeakerStatus, false)}
        >
          <VolumeX className="mr-2 h-4 w-4" />
          <span>Dinleyici Yap</span>
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          onClick={() => handleAction(updateSpeakerStatus, true)}
        >
          <Volume2 className="mr-2 h-4 w-4" />
          <span>Konuşmacı Yap</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive focus:text-destructive"
        onClick={() => handleAction(kickFromVoice)}
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Sesten At</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const avatar = (
    <div className="relative">
      <Avatar
        className={cn(
          "h-12 w-12 border-2 transition-all duration-300",
          participant.isSpeaker && !participant.isMuted
            ? "border-green-500 shadow-lg shadow-green-500/50 animate-pulse"
            : "border-transparent"
        )}
      >
        <AvatarImage src={participant.photoURL || undefined} />
        <AvatarFallback>
          {participant.username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="absolute -bottom-1 -right-1 bg-card p-1 rounded-full shadow-md">
        {participant.isMuted ? (
          <MicOff className="h-3 w-3 text-destructive" />
        ) : (
          <Mic className="h-3 w-3 text-foreground" />
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
            className="cursor-pointer rounded-full"
          >
            {isProcessing ? (
              <Loader2 className="h-12 w-12 animate-spin" />
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
