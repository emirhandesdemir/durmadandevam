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
    const { remoteAudioStreams } = useVoiceChat();
    
    return (
        <div style={{ display: 'none' }}>
            {Object.entries(remoteAudioStreams).map(([uid, stream]) => (
                <AudioElement key={uid} stream={stream} />
            ))}
        </div>
    );
}

function AudioElement({ stream }: { stream: MediaStream }) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return <audio ref={audioRef} autoPlay playsInline />;
}
