'use client';

import { useEffect, useRef } from 'react';

interface ScreenShareViewProps {
    stream: MediaStream;
}

export default function ScreenShareView({ stream }: ScreenShareViewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="w-full aspect-video bg-black rounded-lg mb-4 border border-primary/20 shadow-lg shadow-primary/10">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted // Mute the video element to prevent any potential audio from the screen share
                className="w-full h-full object-contain"
            />
        </div>
    );
}
