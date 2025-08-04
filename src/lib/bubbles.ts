// src/lib/bubbles.ts
'use client';

// This file defines the available chat bubble styles for users to select.

export type BubbleStyle = {
    id: string;
    name: string;
};

export const bubbleStyles: BubbleStyle[] = [
    {
        id: 'none',
        name: 'Yok',
    },
    {
        id: 'bubble-style-1',
        name: 'Neon',
    },
    {
        id: 'bubble-style-2',
        name: 'Okyanus',
    },
    {
        id: 'bubble-style-3',
        name: 'Gün Batımı',
    },
    {
        id: 'bubble-style-4',
        name: 'Orman',
    },
     {
        id: 'bubble-style-fire',
        name: 'Ateş',
    },
    {
        id: 'bubble-style-premium',
        name: 'Altın',
    },
];
