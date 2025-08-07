// src/components/voice/PersistentVoiceBar.tsx
'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Button } from '../ui/button';
import { Mic, MicOff, PhoneOff, ArrowUpLeft, Loader2, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';

export default function PersistentVoiceBar() {
  const { isConnected, isMinimized, self, activeRoom, toggleSelfMute, leaveRoom, expandRoom, isConnecting, isSpeakerMuted, toggleSpeakerMute } = useVoiceChat();
  const router = useRouter();
  const pathname = usePathname();

  const handleExpand = () => {
    if (activeRoom) {
        expandRoom();
        router.push(`/rooms/${activeRoom.id}`);
    }
  };

  // The bar should only be visible if the user is in a room AND has minimized it.
  if (!isMinimized || !activeRoom) {
    return null;
  }
  
  return (
    <AnimatePresence>
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragMomentum={false}
        initial={{ y: 150 }}
        animate={{ y: 0 }}
        exit={{ y: 150 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed bottom-[65px] left-1/2 -translate-x-1/2 w-[95%] max-w-sm z-40"
      >
        <div 
            className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-card text-card-foreground shadow-2xl border border-primary/20 backdrop-blur-lg"
        >
           <button onClick={handleExpand} className="flex items-center gap-2 overflow-hidden flex-1 active:scale-95 transition-transform">
               <div className="flex-shrink-0 p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                    <ArrowUpLeft className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 overflow-hidden text-left">
                    <p className="font-bold text-sm truncate">{activeRoom?.name || 'Sohbet Odası'}</p>
                    <p className="text-xs text-muted-foreground">{isConnected ? "Sesli sohbettesin..." : "Dinliyorsun..."}</p>
                </div>
            </button>
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {isConnected && (
                    <Button onClick={toggleSelfMute} variant="secondary" size="icon" className="rounded-full h-11 w-11">
                        {isConnecting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : self?.isMuted ? (
                            <MicOff className="h-5 w-5 text-destructive" />
                        ) : (
                            <Mic className="h-5 w-5" />
                        )}
                    </Button>
                )}
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
