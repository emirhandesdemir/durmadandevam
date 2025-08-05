// src/components/voice/VoiceAudioPlayer.tsx
'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { useEffect, useRef } from 'react';

/**
 * Bu bileşen, arkaplanda çalışarak diğer kullanıcılardan gelen
 * ses akışlarını (MediaStream) bir <audio> elementine bağlayıp oynatır.
 * Arayüzde görünmezdir.
 */
export default function VoiceAudioPlayer() {
    const { remoteAudioStreams, isSpeakerMuted } = useVoiceChat();
    
    return (
        <div style={{ display: 'none' }}>
            {Object.entries(remoteAudioStreams).map(([uid, stream]) => (
                <AudioElement key={uid} stream={stream} isMuted={isSpeakerMuted} />
            ))}
        </div>
    );
}

function AudioElement({ stream, isMuted }: { stream: MediaStream, isMuted: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            // Check if the stream is different to avoid unnecessary re-assignments
            if(audioRef.current.srcObject !== stream) {
                audioRef.current.srcObject = stream;
            }
            audioRef.current.muted = isMuted;
        }
    }, [stream, isMuted]);

    return <audio ref={audioRef} autoPlay playsInline />;
}
