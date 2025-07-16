
'use client';

import { AvatarState } from './page';
import { useEffect, useRef } from 'react';
import { renderToString } from 'react-dom/server';

interface AvatarPreviewProps {
  avatarState: AvatarState;
  setSvgString: (svg: string) => void;
}

// This is a simplified SVG renderer. A real implementation would be more complex.
export default function AvatarPreview({ avatarState, setSvgString }: AvatarPreviewProps) {
  const { skinColor, hair, eyes, eyebrows, nose, mouth, clothes } = avatarState;

  // Basic shapes to represent features. In a real app, these would be complex <path> elements.
  const featureStyles = {
    hair: {
      style1: (color: string) => <path d="M30 8 C 40 0, 60 0, 70 8 C 95 30, 90 70, 50 95 C 10 70, 5 30, 30 8 Z" fill={color} />,
      style2: (color: string) => <path d="M50 0 Q 20 50, 50 60 Q 80 50, 50 0 Z" fill={color} />,
      style3: (color: string) => <rect x="25" y="10" width="50" height="30" rx="15" fill={color} />,
    },
    eyes: {
      style1: (color: string) => <><circle cx="35" cy="45" r="5" fill={color} /><circle cx="65" cy="45" r="5" fill={color} /></>,
      style2: (color: string) => <><rect x="30" y="42" width="12" height="6" rx="3" fill={color} /><rect x="60" y="42" width="12" height="6" rx="3" fill={color} /></>,
    },
    eyebrows: {
      style1: <path d="M25 35 Q 35 30, 45 35" stroke="black" strokeOpacity="0.3" strokeWidth="2" fill="none" />,
      style2: <><rect x="28" y="32" width="15" height="3" rx="1.5"/><rect x="57" y="32" width="15" height="3" rx="1.5"/></>
    },
    nose: {
      style1: <path d="M50 50 L 45 60 L 55 60 Z" fill="black" fillOpacity="0.2" />,
      style2: <circle cx="50" cy="58" r="3" fill="black" fillOpacity="0.2" />,
    },
    mouth: {
      style1: <path d="M40 75 Q 50 85, 60 75" stroke="black" strokeOpacity="0.4" strokeWidth="2" fill="none"/>,
      style2: <path d="M40 75 Q 50 70, 60 75" stroke="black" strokeOpacity="0.4" strokeWidth="2" fill="none"/>,
    },
    clothes: {
        style1: (color: string) => <path d="M20 90 L 80 90 L 70 110 L 30 110 Z" fill={color} />,
        style2: (color: string) => <circle cx="50" cy="110" r="30" fill={color} />,
    }
  };

  const svgContent = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        {/* Skin */}
        <circle cx="50" cy="50" r="45" fill={skinColor} stroke="#000" strokeOpacity="0.1" strokeWidth="1"/>
        
        {/* Features */}
        {featureStyles.clothes[clothes.style as keyof typeof featureStyles.clothes](clothes.color)}
        {featureStyles.hair[hair.style as keyof typeof featureStyles.hair](hair.color)}
        {featureStyles.eyes[eyes.style as keyof typeof featureStyles.eyes](eyes.color)}
        {featureStyles.eyebrows[eyebrows.style as keyof typeof featureStyles.eyebrows]}
        {featureStyles.nose[nose.style as keyof typeof featureStyles.nose]}
        {featureStyles.mouth[mouth.style as keyof typeof featureStyles.mouth]}
    </svg>
  );

  useEffect(() => {
    // This is not a perfect server-side render, but it's a way to get the string
    // without complex client-side logic for this demo.
    const rawSvgString = renderToString(svgContent);
    setSvgString(rawSvgString);
  }, [avatarState, setSvgString, svgContent]);
  
  return (
    <div className="w-64 h-64 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: skinColor }}>
       {svgContent}
    </div>
  );
}
