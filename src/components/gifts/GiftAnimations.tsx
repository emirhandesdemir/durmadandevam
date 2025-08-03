// src/components/gifts/GiftAnimations.tsx
import { cn } from "@/lib/utils";

// Each component is a self-contained animated SVG.
// They receive a `className` prop to be styled from the outside.

export const AnimatedRose = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <g>
            <path d="M50,95 C40,80 30,70 50,20 C70,70 60,80 50,95" fill="#f43f5e" />
            <path d="M50,20 C45,30 40,40 50,50 C60,40 55,30 50,20" fill="#fecdd3" />
            <path d="M30,60 C20,50 30,40 50,50" fill="#166534" />
            <path d="M70,60 C80,50 70,40 50,50" fill="#166534" />
        </g>
    </svg>
);

export const AnimatedHeart = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <path d="M50,90 C-20,40 50,-20 50,30 C50,-20 120,40 50,90 Z" fill="#ef4444" />
    </svg>
);

export const AnimatedPopper = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <path d="M20,80 L40,20 H60 L80,80 Z" fill="#3b82f6" />
        <rect x="35" y="10" width="30" height="10" fill="#2563eb" />
    </svg>
);

export const AnimatedRocket = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <path d="M50,10 L75,60 H25 Z" fill="#e5e7eb"/>
        <rect x="40" y="55" width="20" height="30" rx="5" fill="#9ca3af"/>
        <circle cx="50" cy="70" r="7" fill="#60a5fa" />
        <path d="M30,85 L20,100 H35Z" fill="#f97316"/>
        <path d="M70,85 L80,100 H65Z" fill="#f97316"/>
    </svg>
);

export const AnimatedCastle = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <rect x="15" y="40" width="70" height="50" fill="#d1d5db"/>
        <rect x="25" y="20" width="15" height="20" fill="#9ca3af"/>
        <rect x="60" y="20" width="15" height="20" fill="#9ca3af"/>
        <path d="M20,20 L32.5,10 L45,20Z" fill="#ef4444"/>
        <path d="M55,20 L67.5,10 L80,20Z" fill="#ef4444"/>
        <rect x="40" y="60" width="20" height="30" fill="#a16207"/>
    </svg>
);

export const AnimatedPlane = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <path d="M50,20 L90,80 L70,80 L50,50 L30,80 L10,80 Z" fill="#60a5fa" />
        <rect x="45" y="10" width="10" height="70" fill="#3b82f6" />
    </svg>
);