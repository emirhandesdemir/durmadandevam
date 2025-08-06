// src/components/voice/VoiceAudioPlayer.tsx
'use client';

import { useEffect, useRef, memo } from 'react';
import { useVoiceChat } from '@/contexts/VoiceChatContext';

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

/**
 * A memoized component to render a single <audio> element.
 * It uses a useEffect hook to safely update the srcObject whenever the stream changes.
 */
const AudioElement = memo(({ stream, isMuted }: { stream: MediaStream, isMuted: boolean }) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (audioElement) {
            // Assign the stream if it's new or has changed.
            if (audioElement.srcObject !== stream) {
                audioElement.srcObject = stream;
            }
            // Apply the muted state.
            audioElement.muted = isMuted;
        }
    }, [stream, isMuted]);

    return <audio ref={audioRef} autoPlay playsInline />;
});

AudioElement.displayName = 'AudioElement';