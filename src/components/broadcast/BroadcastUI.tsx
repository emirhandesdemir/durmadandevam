// src/components/broadcast/BroadcastUI.tsx
'use client';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Room } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import BroadcastControls from './BroadcastControls';
import BroadcastChat from './BroadcastChat';
import FloatingHearts from './FloatingHearts';

interface BroadcastUIProps {
  room: Room;
}

export default function BroadcastUI({ room }: BroadcastUIProps) {
  const { user } = useAuth();
  const {
    localStream,
    remoteVideoStreams,
    joinRoom: joinVoice,
    leaveRoom,
    isConnected,
    isConnecting
  } = useVoiceChat();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showHearts, setShowHearts] = useState(false);

  const isHost = user?.uid === room.createdBy.uid;
  const hostId = room.createdBy.uid;
  const stream = isHost ? localStream : remoteVideoStreams[hostId];

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleHeartClick = () => {
    setShowHearts(true);
    setTimeout(() => setShowHearts(false), 2000); // Animation duration
  };

  return (
    <div className="relative h-full w-full bg-black text-white flex flex-col">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isHost} // Host mutes their own video to prevent echo
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-4">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="text-lg">{isHost ? "Yayın başlatılıyor..." : "Yayın bekleniyor..."}</p>
        </div>
      )}

      {/* Overlay for chat and controls */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/60 via-transparent to-black/30">
        <BroadcastChat roomId={room.id} />
        
        <div className="flex items-end justify-between">
           <div className="w-full">
              {/* Chat Input would go here, but for now we focus on viewing */}
           </div>
           <FloatingHearts trigger={showHearts} />
        </div>
      </div>
      
       <BroadcastControls
        isHost={isHost}
        onHeartClick={handleHeartClick}
        onLeave={leaveRoom}
      />

       {/* Initial Join Button for viewers */}
       {!isConnected && !isConnecting && !isHost && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                <Button onClick={() => joinVoice()} size="lg">Yayına Katıl</Button>
            </div>
        )}
    </div>
  );
}
