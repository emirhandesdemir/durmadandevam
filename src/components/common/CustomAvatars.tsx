// src/components/common/CustomAvatars.tsx
'use client';
import { cn } from "@/lib/utils";
import React from "react";

// Individual Avatar Components with CSS Animations
const RobotAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <style>{`
            .robot-eye { animation: robot-blink 4s infinite; }
            @keyframes robot-blink { 0%, 90%, 100% { fill: #3b82f6; } 95% { fill: #93c5fd; } }
            .robot-antenna-light { animation: robot-antenna-pulse 2s infinite alternate; }
            @keyframes robot-antenna-pulse { from { fill: #facc15; } to { fill: #fef08a; } }
        `}</style>
        <rect x="15" y="25" width="70" height="60" rx="10" fill="#9ca3af" />
        <rect x="25" y="15" width="50" height="10" fill="#6b7280" />
        <rect x="45" y="5" width="10" height="10" fill="#4b5563" />
        <circle className="robot-antenna-light" cx="50" cy="5" r="3" />
        <rect x="30" y="40" width="40" height="20" rx="5" fill="#e5e7eb" />
        <circle className="robot-eye" cx="40" cy="50" r="5" />
        <circle className="robot-eye" cx="60" cy="50" r="5" />
        <rect x="35" y="70" width="30" height="5" rx="2.5" fill="#6b7280" />
    </svg>
);

const CatAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <style>{`
            .cat-tail { animation: cat-tail-wag 3s ease-in-out infinite; transform-origin: 15px 85px; }
            @keyframes cat-tail-wag { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        `}</style>
        <path className="cat-tail" d="M15 85 Q 30 70 40 85" stroke="#a16207" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M20 90 L 80 90 A 10 10 0 0 1 90 80 L 90 40 A 10 10 0 0 0 80 30 L 20 30 A 10 10 0 0 0 10 40 L 10 80 A 10 10 0 0 1 20 90 Z" fill="#f59e0b"/>
        <path d="M10 40 L 0 20 L 30 30 Z" fill="#f59e0b" />
        <path d="M90 40 L 100 20 L 70 30 Z" fill="#f59e0b" />
        <circle cx="35" cy="55" r="5" fill="black" />
        <circle cx="65" cy="55" r="5" fill="black" />
        <path d="M45 70 Q 50 75 55 70" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
);

const GhostAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
         <style>{`
            .ghost-body { animation: ghost-float 5s ease-in-out infinite; }
            @keyframes ghost-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        `}</style>
        <g className="ghost-body">
            <path d="M20 100 V 40 C 20 15, 80 15, 80 40 V 100 L 70 90 L 60 100 L 50 90 L 40 100 L 30 90 Z" fill="#e5e7eb"/>
            <circle cx="40" cy="50" r="6" fill="black"/>
            <circle cx="60" cy="50" r="6" fill="black"/>
        </g>
    </svg>
);

const SunAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <style>{`
            .sun-core { animation: sun-pulse 4s infinite; transform-origin: center; }
            .sun-ray { animation: sun-spin 20s linear infinite; transform-origin: center; }
            @keyframes sun-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            @keyframes sun-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
        <g className="sun-ray">
            {[...Array(8)].map((_, i) => (
                <rect key={i} x="47.5" y="5" width="5" height="20" rx="2.5" fill="#fcd34d" transform={`rotate(${i * 45} 50 50)`} />
            ))}
        </g>
        <circle className="sun-core" cx="50" cy="50" r="30" fill="#fca5a5" />
        <circle cx="40" cy="45" r="5" fill="white" />
        <circle cx="60" cy="45" r="5" fill="white" />
        <path d="M40 60 Q 50 70 60 60" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
);

const RocketAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <style>{`
            .rocket-shake { animation: rocket-shake-anim 0.5s infinite; }
            @keyframes rocket-shake-anim { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-1px, 1px); } 75% { transform: translate(1px, -1px); } }
        `}</style>
        <g className="rocket-shake">
            <path d="M50 10 L 70 60 L 50 50 L 30 60 Z" fill="#ef4444" />
            <rect x="40" y="50" width="20" height="30" fill="#e5e7eb" />
            <circle cx="50" cy="65" r="7" fill="#3b82f6" />
            <path d="M30 80 L 20 95 H 35 Z" fill="#f97316" />
            <path d="M70 80 L 80 95 H 65 Z" fill="#f97316" />
        </g>
    </svg>
);

const AlienAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <style>{`
            .ufo-light { animation: ufo-light-beam 3s infinite; }
            @keyframes ufo-light-beam { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }
        `}</style>
        <path className="ufo-light" d="M20 60 L 40 100 H 60 L 80 60 Z" fill="#a7f3d0" opacity="0.3" />
        <path d="M10 60 Q 50 30 90 60" fill="#9ca3af"/>
        <path d="M20 50 Q 50 20 80 50" fill="#e5e7eb" />
        <circle cx="50" cy="35" r="8" fill="#4ade80" />
    </svg>
);

const SkullAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <style>{`
            .jaw-chatter { animation: jaw-chatter-anim 5s ease-in-out infinite; }
            @keyframes jaw-chatter-anim { 0%, 100%, 10% { transform: translateY(0); } 5% { transform: translateY(3px); } }
        `}</style>
        <path d="M30 15 C 10 30, 10 70, 30 85 H 70 C 90 70, 90 30, 70 15 Z" fill="#e5e7eb" />
        <circle cx="40" cy="40" r="10" fill="black" />
        <circle cx="60" cy="40" r="10" fill="black" />
        <path d="M50 55 L 45 65 H 55 Z" fill="black" />
        <g className="jaw-chatter">
            <rect x="35" y="70" width="30" height="5" fill="#d1d5db" />
        </g>
    </svg>
);

const WizardAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <style>{`
            .magic-orb { animation: magic-orb-glow 2.5s infinite alternate; }
            @keyframes magic-orb-glow { from { filter: drop-shadow(0 0 2px #a78bfa); } to { filter: drop-shadow(0 0 6px #a78bfa); } }
        `}</style>
        <path d="M50 5 L 90 95 H 10 Z" fill="#4c1d95" />
        <path d="M50 5 L 60 40 H 40 Z" fill="#6d28d9" />
        <circle className="magic-orb" cx="50" cy="80" r="8" fill="#a78bfa" />
    </svg>
);

const NinjaAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
         <style>{`
            .ninja-eyes { animation: ninja-eyes-glow 3s infinite alternate; }
            @keyframes ninja-eyes-glow { from { fill: #f87171; } to { fill: #ef4444; } }
        `}</style>
        <circle cx="50" cy="50" r="40" fill="#1f2937" />
        <path d="M20 45 H 80 V 55 H 20 Z" fill="#4b5563" />
        <path d="M30 47.5 L 40 50 L 30 52.5 Z" className="ninja-eyes" />
        <path d="M70 47.5 L 60 50 L 70 52.5 Z" className="ninja-eyes" />
    </svg>
);

const CreatureAvatar = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={cn(className)}>
        <style>{`
            .creature-bounce { animation: creature-bounce-anim 2s ease-in-out infinite; }
            @keyframes creature-bounce-anim { 0%, 100% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-5px) scale(0.95, 1.05); } }
        `}</style>
        <g className="creature-bounce">
            <path d="M50 20 C 80 20, 95 40, 95 60 S 75 100, 50 100 S 5 80, 5 60 S 20 20, 50 20" fill="#60a5fa" />
            <circle cx="50" cy="50" r="20" fill="white"/>
            <circle cx="50" cy="50" r="10" fill="black"/>
        </g>
    </svg>
);

export type AvatarInfo = {
    id: string;
    name: string;
    component: React.ComponentType<{ className?: string }>;
};

export const avatarList: AvatarInfo[] = [
    { id: "avatar-robot", name: "Robot", component: RobotAvatar },
    { id: "avatar-cat", name: "Kedi", component: CatAvatar },
    { id: "avatar-ghost", name: "Hayalet", component: GhostAvatar },
    { id: "avatar-sun", name: "Güneş", component: SunAvatar },
    { id: "avatar-rocket", name: "Roket", component: RocketAvatar },
    { id: "avatar-alien", name: "Uzaylı", component: AlienAvatar },
    { id: "avatar-skull", name: "Kafatası", component: SkullAvatar },
    { id: "avatar-wizard", name: "Büyücü", component: WizardAvatar },
    { id: "avatar-ninja", name: "Ninja", component: NinjaAvatar },
    { id: "avatar-creature", name: "Yaratık", component: CreatureAvatar },
];

export const getAvatarById = (id: string | null | undefined): React.ComponentType<{ className?: string }> | null => {
    if (!id) return null;
    return avatarList.find(a => a.id === id)?.component || null;
}
