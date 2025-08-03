// src/lib/gifts.ts

import { Rose, Heart, PartyPopper, Rocket, Castle, Plane } from "lucide-react";
import { 
    AnimatedRose, 
    AnimatedHeart, 
    AnimatedPopper, 
    AnimatedRocket, 
    AnimatedCastle, 
    AnimatedPlane 
} from "@/components/gifts/GiftAnimations";


export interface Gift {
    id: string;
    name: string;
    icon: React.ElementType;
    diamondCost: number;
    animationClass?: string;
}

export const giftList: Gift[] = [
    {
        id: 'rose',
        name: 'Gül',
        icon: AnimatedRose,
        diamondCost: 1,
        animationClass: 'gift-animate-rose'
    },
    {
        id: 'heart',
        name: 'Kalp',
        icon: AnimatedHeart,
        diamondCost: 5,
        animationClass: 'gift-animate-heart'
    },
    {
        id: 'popper',
        name: 'Parti Patlatıcısı',
        icon: AnimatedPopper,
        diamondCost: 10,
        animationClass: 'gift-animate-popper'
    },
    {
        id: 'rocket',
        name: 'Roket',
        icon: AnimatedRocket,
        diamondCost: 50,
        animationClass: 'gift-animate-rocket'
    },
    {
        id: 'castle',
        name: 'Kale',
        icon: AnimatedCastle,
        diamondCost: 100,
        animationClass: 'gift-animate-castle'
    },
    {
        id: 'plane',
        name: 'Uçak',
        icon: AnimatedPlane,
        diamondCost: 1000,
        animationClass: 'gift-animate-plane'
    },
];

export const getGiftById = (id: string): Gift | undefined => {
    return giftList.find(g => g.id === id);
}

export const giftLevelThresholds = [
    { level: 0, diamonds: 0 },
    { level: 1, diamonds: 100 },
    { level: 2, diamonds: 500 },
    { level: 3, diamonds: 1000 },
    { level: 4, diamonds: 2500 },
    { level: 5, diamonds: 5000 },
    { level: 6, diamonds: 10000 },
    { level: 7, diamonds: 25000 },
    { level: 8, diamonds: 50000 },
    { level: 9, diamonds: 75000 },
    { level: 10, diamonds: 100000 },
];
