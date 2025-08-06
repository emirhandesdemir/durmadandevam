
// src/components/voice/VoiceAudioPlayer.tsx
'use client';

import { useEffect, useRef, memo } from 'react';
import { useVoiceChat } from '@/contexts/VoiceChatContext';

/**
 * This component renders the audio streams from remote participants.
 * It's kept separate to memoize and prevent unnecessary re-renders of audio elements.
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
 * It uses a useEffect hook to safely update the srcObject whenever the stream changes,
 * which is crucial for handling stream updates correctly.
 */
const AudioElement = memo(({ stream, isMuted }: { stream: MediaStream, isMuted: boolean }) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (audioElement) {
            // Assign the stream only if it's new or has changed to avoid unnecessary re-assignments.
            if (audioElement.srcObject !== stream) {
                audioElement.srcObject = stream;
            }
            // Ensure the muted state is always in sync.
            audioElement.muted = isMuted;
        }
    }, [stream, isMuted]);

    return <audio ref={audioRef} autoPlay playsInline />;
});

AudioElement.displayName = 'AudioElement';
