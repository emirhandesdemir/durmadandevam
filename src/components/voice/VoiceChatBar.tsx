// src/components/voice/VoiceChatBar.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { leaveVoiceChat, toggleSelfMute } from "@/lib/actions/voiceActions";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Loader2 } from "lucide-react";
import VoiceUserIcon from "./VoiceUserIcon";

interface VoiceChatBarProps {
  roomId: string;
  isHost: boolean;
}

/**
 * Sesli sohbetin ana kontrol barı.
 * Ekranın altında sabit durur, katılımcıları ve kontrol düğmelerini gösterir.
 */
export default function VoiceChatBar({ roomId, isHost }: VoiceChatBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { participants, self, isConnected, isLoading } = useVoiceChat(roomId);

  // Sesli sohbetten ayrılma fonksiyonu
  const handleLeave = async () => {
    try {
      await leaveVoiceChat(roomId);
      toast({ description: "Sesli sohbetten ayrıldınız." });
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    }
  };

  // Mikrofonu açıp kapatma fonksiyonu
  const handleToggleMute = async () => {
    if (!self) return;
    // Sadece hoparlörler mikrofonunu açabilir
    if (!self.isSpeaker && self.isMuted) {
        toast({ variant: "destructive", title: "Dinleyici Modu", description: "Konuşmak için oda yöneticisinden izin istemelisiniz." });
        return;
    }

    try {
      await toggleSelfMute(roomId, !self.isMuted);
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message });
    }
  };

  if (isLoading || !isConnected || !user || !self) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-sm border-t flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Sesli sohbete bağlanılıyor...</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-sm border-t z-30 animate-in slide-in-from-bottom-full duration-500">
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        {/* Katılımcı ikonları */}
        <div className="flex items-center gap-2">
          {participants.map((p) => (
            <VoiceUserIcon
              key={p.uid}
              participant={p}
              isHost={isHost}
              currentUserId={user.uid}
              roomId={roomId}
            />
          ))}
        </div>

        {/* Kontrol düğmeleri */}
        <div className="flex items-center gap-2">
          <Button
            variant={self.isMuted ? "destructive" : "outline"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={handleToggleMute}
          >
            {self.isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={handleLeave}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
