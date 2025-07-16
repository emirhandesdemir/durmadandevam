// src/components/avatar-creator/options.ts
import { icons } from 'lucide-react';
import type { Option } from './types';

export const HAIR_OPTIONS: { male: Option[], female: Option[] } = {
    male: [
        { id: 'short', name: 'Kısa', icon: icons.User },
        { id: 'buzz', name: 'Sıfır', icon: icons.User },
        { id: 'medium', name: 'Orta', icon: icons.User },
        { id: 'mohawk', name: 'Mohawk', icon: icons.User },
    ],
    female: [
        { id: 'long', name: 'Uzun', icon: icons.User },
        { id: 'ponytail', name: 'At Kuyruğu', icon: icons.User },
        { id: 'bob', name: 'Küt', icon: icons.User },
        { id: 'pixie', name: 'Kısa', icon: icons.User },
    ]
};

export const EYES_OPTIONS: Option[] = [
    { id: 'normal', name: 'Normal', icon: icons.Eye },
    { id: 'closed', name: 'Kapalı', icon: icons.EyeOff },
    { id: 'wink', name: 'Göz Kırpma', icon: icons.Eye },
    { id: 'happy', name: 'Mutlu', icon: icons.Smile },
];

export const EYEBROWS_OPTIONS: Option[] = [
    { id: 'normal', name: 'Normal' },
    { id: 'raised', name: 'Kalkık' },
    { id: 'angry', name: 'Kızgın' },
];

export const MOUTH_OPTIONS: Option[] = [
    { id: 'normal', name: 'Normal', icon: icons.Smile },
    { id: 'grin', name: 'Sırıtma', icon: icons.SmilePlus },
    { id: 'sad', name: 'Üzgün', icon: icons.Frown },
    { id: 'open', name: 'Açık', icon: icons.Smile },
];

export const NOSE_OPTIONS: Option[] = [
    { id: 'normal', name: 'Normal' },
    { id: 'pointy', name: 'Sivri' },
    { id: 'wide', name: 'Geniş' },
];

export const FACIAL_HAIR_OPTIONS: Option[] = [
     { id: 'none', name: 'Yok' },
    { id: 'beard', name: 'Sakal' },
    { id: 'mustache', name: 'Bıyık' },
];
