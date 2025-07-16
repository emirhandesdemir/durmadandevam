// src/components/avatar-creator/AvatarPreview.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { AvatarState } from './types';

interface AvatarPreviewProps {
    avatarState: AvatarState;
    setSvgString: (svg: string) => void;
}

const BaseAvatar = ({ skinColor }: { skinColor: string }) => (
    <g>
        <circle cx="100" cy="100" r="80" fill={skinColor} />
        <circle cx="100" cy="100" r="80" stroke="#E0E0E0" strokeWidth="2" fill="none" />
    </g>
);

const Eyes = ({ color, style }: { color: string; style: string }) => {
    // Placeholder for different eye styles
    return (
        <g>
            <circle cx="75" cy="90" r="10" fill="white" />
            <circle cx="125" cy="90" r="10" fill="white" />
            <circle cx="75" cy="90" r="5" fill={color} />
            <circle cx="125" cy="90" r="5" fill={color} />
        </g>
    );
};

const Mouth = ({ style }: { style: string }) => {
     // Placeholder for different mouth styles
    return <path d="M 75 130 Q 100 145 125 130" stroke="black" strokeWidth="3" fill="none" />;
};

const Nose = ({ style }: { style: string }) => {
     // Placeholder for different nose styles
    return <path d="M 100 105 L 95 120 L 105 120 Z" fill="rgba(0,0,0,0.1)" />;
};

const Eyebrows = ({ style }: { style: string }) => {
    // Placeholder for different eyebrow styles
    return (
        <g>
            <path d="M 65 70 Q 75 65 85 70" stroke="black" strokeWidth="4" fill="none" />
            <path d="M 115 70 Q 125 65 135 70" stroke="black" strokeWidth="4" fill="none" />
        </g>
    )
}

const Hair = ({ color, style, gender }: { color: string; style: string; gender: 'male' | 'female' }) => {
    // Placeholder for different hair styles
    return <path d="M 60 20 Q 100 0 140 20 L 140 80 Q 100 60 60 80 Z" fill={color} />;
}

export default function AvatarPreview({ avatarState, setSvgString }: AvatarPreviewProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    
    useEffect(() => {
        if(svgRef.current) {
            setSvgString(svgRef.current.outerHTML);
        }
    }, [avatarState, setSvgString]);

    return (
        <div className="w-64 h-64 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-card">
             <svg ref={svgRef} width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <BaseAvatar skinColor={avatarState.skinColor} />
                <Hair color={avatarState.hair.color} style={avatarState.hair.style} gender={avatarState.gender} />
                <Eyes color={avatarState.eyes.color} style={avatarState.eyes.style} />
                <Eyebrows style={avatarState.eyebrows.style} />
                <Nose style={avatarState.nose.style} />
                <Mouth style={avatarState.mouth.style} />
            </svg>
        </div>
    );
}
