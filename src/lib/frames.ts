// src/lib/frames.ts
'use client';

// This file defines the available avatar frames for users to select.

export type AvatarFrame = {
    id: string;
    name: string;
    description: string;
    premiumOnly: boolean;
};

export const avatarFrames: AvatarFrame[] = [
    {
        id: 'none',
        name: 'Yok',
        description: 'Çerçeve kullanma.',
        premiumOnly: false,
    },
    {
        id: 'avatar-frame-premium',
        name: 'Altın Premium',
        description: 'Parıldayan altın bir çerçeve.',
        premiumOnly: true,
    },
    {
        id: 'avatar-frame-angel',
        name: 'Melek Kanatları',
        description: 'Zarif ve parıldayan melek kanatları.',
        premiumOnly: false,
    },
    {
        id: 'avatar-frame-devil',
        name: 'Şeytan Kanatları',
        description: 'Koyu ve karizmatik şeytan kanatları.',
        premiumOnly: false,
    },
    {
        id: 'avatar-frame-tech',
        name: 'Teknolojik Halka',
        description: 'Fütüristik ve hareketli bir halka.',
        premiumOnly: false,
    },
    {
        id: 'avatar-frame-snake',
        name: 'Yılan Halkası',
        description: 'Avatarınızın etrafında dönen bir yılan.',
        premiumOnly: false,
    },
];
