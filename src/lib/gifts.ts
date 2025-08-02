// src/lib/gifts.ts

import { Rose, Heart, PartyPopper, Rocket, Castle } from "lucide-react";

export interface Gift {
    id: string;
    name: string;
    icon: React.ElementType;
    diamondCost: number;
}

export const giftList: Gift[] = [
    {
        id: 'rose',
        name: 'Gül',
        icon: Rose,
        diamondCost: 1,
    },
    {
        id: 'heart',
        name: 'Kalp',
        icon: Heart,
        diamondCost: 5,
    },
    {
        id: 'popper',
        name: 'Parti Şapkası',
        icon: PartyPopper,
        diamondCost: 10,
    },
    {
        id: 'rocket',
        name: 'Roket',
        icon: Rocket,
        diamondCost: 50,
    },
    {
        id: 'castle',
        name: 'Kale',
        icon: Castle,
        diamondCost: 100,
    },
];

export const getGiftById = (id: string): Gift | undefined => {
    return giftList.find(g => g.id === id);
}
