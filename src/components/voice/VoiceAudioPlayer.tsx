// src/components/voice/VoiceAudioPlayer.tsx
'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { useEffect, useRef, memo } from 'react';

/**
 * This component is responsible for playing the audio streams from remote participants.
 * It remains invisible in the UI.
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
                console.log("Updating audio stream for a remote user.");
                audioElement.srcObject = stream;
            }
            // Apply the muted state.
            audioElement.muted = isMuted;
        }
    }, [stream, isMuted]); // Rerun effect if stream or isMuted changes

    // The `key` prop on AudioElement in the parent ensures this component
    // remounts if a user disconnects and reconnects, getting a fresh audio element.
    return <audio ref={audioRef} autoPlay playsInline />;
});

AudioElement.displayName = 'AudioElement';
