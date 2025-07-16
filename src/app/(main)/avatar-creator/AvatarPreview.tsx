'use client';

import { AvatarState } from './page';

interface AvatarPreviewProps {
  avatarState: AvatarState;
}

// This is a simplified SVG renderer. A real implementation would be more complex.
export default function AvatarPreview({ avatarState }: AvatarPreviewProps) {
  const { gender, skinColor, hair, eyes, nose, mouth, clothes } = avatarState;

  // Basic shapes to represent features. In a real app, these would be complex <path> elements.
  const featureStyles = {
    hair: {
      style1: <path d="M30 8 C 40 0, 60 0, 70 8 C 95 30, 90 70, 50 95 C 10 70, 5 30, 30 8 Z" fill={hair.color} />,
      style2: <path d="M50 0 Q 20 50, 50 60 Q 80 50, 50 0 Z" fill={hair.color} />,
      style3: <rect x="25" y="10" width="50" height="30" rx="15" fill={hair.color} />,
    },
    eyes: {
      style1: <><circle cx="35" cy="45" r="5" fill={eyes.color} /><circle cx="65" cy="45" r="5" fill={eyes.color} /></>,
      style2: <><rect x="30" y="42" width="12" height="6" rx="3" fill={eyes.color} /><rect x="60" y="42" width="12" height="6" rx="3" fill={eyes.color} /></>,
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
        style1: <path d="M20 90 L 80 90 L 70 110 L 30 110 Z" fill={clothes.color} />,
        style2: <circle cx="50" cy="110" r="30" fill={clothes.color} />,
    }
  };
  
  return (
    <div className="w-64 h-64 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: skinColor }}>
       <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Skin */}
            <circle cx="50" cy="50" r="45" fill={skinColor} stroke="#000" strokeOpacity="0.1" strokeWidth="1"/>
            
            {/* Features */}
            {featureStyles.clothes[clothes.style as keyof typeof featureStyles.clothes]}
            {featureStyles.hair[hair.style as keyof typeof featureStyles.hair]}
            {featureStyles.eyes[eyes.style as keyof typeof featureStyles.eyes]}
            {featureStyles.nose[nose.style as keyof typeof featureStyles.nose]}
            {featureStyles.mouth[mouth.style as keyof typeof featureStyles.mouth]}

        </svg>
    </div>
  );
}
