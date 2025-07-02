// src/components/broadcast/BroadcastControls.tsx
'use client';
import { Button } from '../ui/button';
import { Mic, MicOff, Video, VideoOff, SwitchCamera, Phone, Heart } from 'lucide-react';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { motion } from 'framer-motion';

interface BroadcastControlsProps {
  isHost: boolean;
  onHeartClick: () => void;
  onLeave: () => void;
}

export default function BroadcastControls({ isHost, onHeartClick, onLeave }: BroadcastControlsProps) {
  const { self, isSharingVideo, toggleSelfMute, startVideo, stopVideo, switchCamera } = useVoiceChat();

  const handleToggleVideo = () => {
    if (isSharingVideo) stopVideo();
    else startVideo();
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/40 p-2 backdrop-blur-sm"
    >
      {isHost && (
        <>
          <Button onClick={toggleSelfMute} variant="secondary" size="icon" className="h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30">
            {self?.isMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button onClick={handleToggleVideo} variant="secondary" size="icon" className="h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30">
            {isSharingVideo ? <Video /> : <VideoOff />}
          </Button>
          <Button onClick={switchCamera} variant="secondary" size="icon" className="h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30" disabled={!isSharingVideo}>
            <SwitchCamera />
          </Button>
        </>
      )}
      {!isHost && (
        <Button onClick={onHeartClick} variant="secondary" size="icon" className="h-12 w-12 rounded-full bg-white/20 text-white hover:bg-white/30">
          <Heart className="text-red-500 fill-current" />
        </Button>
      )}
      <Button onClick={onLeave} variant="destructive" size="icon" className="h-12 w-12 rounded-full">
        <Phone />
      </Button>
    </motion.div>
  );
}
