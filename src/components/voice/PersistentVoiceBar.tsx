// src/components/voice/PersistentVoiceBar.tsx
'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Button } from '../ui/button';
import { Mic, MicOff, PhoneOff, ArrowUpLeft, Loader2, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function PersistentVoiceBar() {
  const { isConnected, isMinimized, self, activeRoom, toggleSelfMute, leaveRoom, expandRoom, isConnecting, isSpeakerMuted, toggleSpeakerMute } = useVoiceChat();
  const router = useRouter();

  if (!isConnected || !isMinimized || !activeRoom) {
    return null;
  }

  const handleExpand = () => {
    expandRoom();
    router.push(`/rooms/${activeRoom.id}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-sm z-40"
      >
        <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-card text-card-foreground shadow-2xl border border-primary/20 backdrop-blur-lg">
           <div className="flex items-center gap-2 overflow-hidden flex-1">
               <button onClick={handleExpand} className="flex-shrink-0 p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                    <ArrowUpLeft className="h-5 w-5 text-primary" />
                </button>
                <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-sm truncate">{activeRoom.name}</p>
                    <p className="text-xs text-muted-foreground">Sesli sohbettesin...</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button onClick={toggleSelfMute} variant="secondary" size="icon" className="rounded-full h-11 w-11">
                    {isConnecting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : self?.isMuted ? (
                        <MicOff className="h-5 w-5 text-destructive" />
                    ) : (
                        <Mic className="h-5 w-5" />
                    )}
                </Button>
                <Button onClick={toggleSpeakerMute} variant="secondary" size="icon" className="rounded-full h-11 w-11">
                    {isSpeakerMuted ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5" />}
                </Button>
                <Button onClick={leaveRoom} variant="destructive" size="icon" className="rounded-full h-11 w-11">
                    <PhoneOff className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
