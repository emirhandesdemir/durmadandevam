// src/components/avatar-creator/types.ts
import type { LucideIcon } from "lucide-react";

export interface Option {
    id: string;
    name: string;
    icon?: LucideIcon; // For simple representation
}

export interface AvatarState {
    gender: 'male' | 'female';
    skinColor: string;
    hair: {
        style: string;
        color: string;
    },
    eyes: {
        style: string;
        color: string;
    },
    eyebrows: {
        style: string;
    },
    nose: {
        style: string;
    },
    mouth: {
        style: string;
    },
    facialHair: {
        style: string;
    }
}
