// src/app/(main)/avatar-creator/AvatarPreview.tsx
'use client';

import React, { useEffect, useReducer, useRef } from 'react';

// Avatar State & Reducer
export interface AvatarPart {
  shape: string;
  color: string;
}

export interface AvatarState {
  gender: 'male' | 'female';
  skinTone: string;
  faceShape: string;
  hair: AvatarPart;
  eyes: AvatarPart;
  eyebrows: AvatarPart;
  nose: AvatarPart;
  mouth: AvatarPart;
  clothing: AvatarPart;
}

export const initialAvatarState: AvatarState = {
  gender: 'male',
  skinTone: '#F2D5B1',
  faceShape: 'oval',
  hair: { shape: 'short', color: '#2C1404' },
  eyes: { shape: 'default', color: '#6A4B3A' },
  eyebrows: { shape: 'default', color: '#2C1404' },
  nose: { shape: 'default', color: '' }, // Color not typically used
  mouth: { shape: 'smile', color: '#D99A9A' },
  clothing: { shape: 'tshirt', color: '#5A63A5' },
};

export function avatarReducer(state: AvatarState, action: { type: string; payload: any }): AvatarState {
  switch (action.type) {
    case 'SET_GENDER':
      return { ...initialAvatarState, gender: action.payload };
    case 'SET_SKIN_TONE':
      return { ...state, skinTone: action.payload };
    case 'SET_HAIR_STYLE':
      return { ...state, hair: { ...state.hair, shape: action.payload } };
    case 'SET_HAIR_COLOR':
      return { ...state, hair: { ...state.hair, color: action.payload } };
    case 'SET_EYE_SHAPE':
      return { ...state, eyes: { ...state.eyes, shape: action.payload } };
    case 'SET_EYE_COLOR':
        return { ...state, eyes: { ...state.eyes, color: action.payload } };
    case 'SET_EYEBROW_SHAPE':
        return { ...state, eyebrows: { ...state.eyebrows, shape: action.payload } };
    case 'SET_EYEBROW_COLOR':
        return { ...state, eyebrows: { ...state.eyebrows, color: action.payload } };
    case 'SET_CLOTHING_STYLE':
        return { ...state, clothing: { ...state.clothing, shape: action.payload } };
    case 'SET_CLOTHING_COLOR':
        return { ...state, clothing: { ...state.clothing, color: action.payload } };
    // Add other cases for nose, mouth, etc.
    default:
      return state;
  }
}

// SVG Components
const Face = ({ shape, color }: { shape: string, color: string }) => {
    const d = shape === 'oval' ? "M 50,20 C 80,20 90,60 90,100 H 10 C 10,60 20,20 50,20 Z" : "M 40,20 C 70,20 95,50 95,100 H 5 C 5,50 30,20 40,20 Z";
    return <path d={d} fill={color} />;
};

const Hair = ({ shape, color }: { shape: string, color: string }) => {
    const styles: { [key: string]: JSX.Element } = {
        short: <path d="M 50,10 C 20,10 10,40 10,50 C 15,30 30,25 50,25 C 70,25 85,30 90,50 C 90,40 80,10 50,10 Z" fill={color} />,
        long: <path d="M 50,5 C 5,5 0,50 15,95 C 30,40 50,20 70,40 C 85,50 95,5 50,5 Z" fill={color} />,
        buzz: <path d="M 50,20 C 25,20 15,35 15,50 C 25,40 40,35, 50,35 C 60,35 75,40 85,50 C 85,35 75,20 50,20 Z" fill={color} />
    };
    return styles[shape] || null;
};

const Eyes = ({ shape, color }: { shape: string, color: string }) => {
    return (
        <>
            <circle cx="35" cy="60" r="5" fill={color} />
            <circle cx="65" cy="60" r="5" fill={color} />
        </>
    );
};

const Eyebrows = ({ shape, color }: { shape: string, color: string }) => {
     const styles: { [key: string]: JSX.Element } = {
        default: <><path d="M25 50 Q 35 45, 45 50" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M55 50 Q 65 45, 75 50" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" /></>,
        thin: <><path d="M27 50 Q 35 48, 43 50" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M57 50 Q 65 48, 73 50" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /></>,
        angry: <><path d="M25 52 L 45 48" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"/><path d="M75 52 L 55 48" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"/></>,
    };
    return styles[shape] || null;
}

const Nose = () => <path d="M 50,65 L 50,75" stroke="#000" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />;
const Mouth = () => <path d="M 40,85 Q 50,95 60,85" stroke="#000" strokeOpacity="0.3" strokeWidth="2" fill="none" strokeLinecap="round" />;

const Clothing = ({ shape, color }: { shape: string, color: string }) => {
    const styles: { [key: string]: JSX.Element } = {
        tshirt: <path d="M 10 95 C 10 95, 30 110, 50 110 C 70 110, 90 95, 90 95 L 90 120 H 10 Z" fill={color} />,
        hoodie: <path d="M 5 95 C 5 95, 25 115, 50 115 C 75 115, 95 95, 95 95 V 120 H 5 Z M 40 90 A 20 20 0 0 1 60 90" fill={color} />,
    };
    return styles[shape] || null;
}

// Main Preview Component
interface AvatarPreviewProps {
  avatarState: AvatarState;
  setSvgString: (svg: string) => void;
}

export default function AvatarPreview({ avatarState, setSvgString }: AvatarPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
        // Pretty print the SVG string for storage
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgRef.current);
        // Basic formatting for readability
        svgString = svgString.replace(/><path/g, '>\n  <path');
        setSvgString(svgString);
    }
  }, [avatarState, setSvgString]);

  return (
    <svg ref={svgRef} viewBox="0 0 100 120" className="w-full h-full">
      <g>
        <Face shape={avatarState.faceShape} color={avatarState.skinTone} />
        <Clothing shape={avatarState.clothing.shape} color={avatarState.clothing.color} />
        <Eyes shape={avatarState.eyes.shape} color={avatarState.eyes.color} />
        <Eyebrows shape={avatarState.eyebrows.shape} color={avatarState.eyebrows.color} />
        <Nose />
        <Mouth />
        <Hair shape={avatarState.hair.shape} color={avatarState.hair.color} />
      </g>
    </svg>
  );
}
