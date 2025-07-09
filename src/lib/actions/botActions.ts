'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getCountFromServer, query, where, serverTimestamp, doc } from 'firebase/firestore';
import type { UserProfile } from '../types';

// Predefined bot data
const femaleUsernames = ['elif_dans', 'melis_kahve', 'zeynep_geziyor', 'ayla_sanat', 'selin_muzik', 'derya_gunes'];
const maleUsernames = ['can_spor', 'emir_tech'];
const bios = [
    "Kahve ve kitap tutkunu ☕📚",
    "Dans etmeyi çok seviyorum 💃",
    "Mutlu anlar biriktiriyorum ✨",
    "Yeni yerler keşfetmek en büyük hobim 🌍",
    "Müzik ruhun gıdasıdır 🎶",
    "Hayatı akışına bırakıyorum 🧘‍♀️",
    "Spor benim yaşam tarzım 🏋️‍♂️",
    "Teknoloji ve gelecek 🚀"
];

async function fetchRandomAvatar(gender: 'women' | 'men', index: number) {
    // This is a simplified approach. A real implementation might need a more robust way
    // to get unique avatars, as the randomuser.me API might return the same one.
    // For this purpose, we'll just use the index to vary the seed.
    try {
        const response = await fetch(`https://randomuser.me/api/?gender=${gender === 'women' ? 'female' : 'male'}&inc=picture&seed=${gender}${index}${Date.now()}`);
        const data = await response.json();
        return data.results[0].picture.large;
    } catch (error) {
        console.error("Could not fetch avatar, using placeholder.", error);
        return 'https://placehold.co/128x128.png';
    }
}

export async function getBotCount() {
    const botsQuery = query(collection(db, 'users'), where('isBot', '==', true));
    const snapshot = await getCountFromServer(botsQuery);
    return snapshot.data().count;
}

export async function createInitialBots() {
    let createdCount = 0;
    try {
        const usersCol = collection(db, 'users');

        // Create 6 female bots
        for (let i = 0; i < 6; i++) {
            const username = femaleUsernames[i] || `kadin_bot_${i}`;
            const existingUserQuery = query(usersCol, where('username', '==', username), where('isBot', '==', true));
            const existingUserSnap = await getDocs(existingUserQuery);
            if (existingUserSnap.empty) {
                const newBot: Omit<UserProfile, 'uid'|'createdAt'> = {
                    username: username,
                    email: `${username}@bot.hiwewalk.com`,
                    photoURL: await fetchRandomAvatar('women', i),
                    isBot: true,
                    bio: bios[i] || "Yeni maceralar peşinde...",
                    gender: 'female',
                    role: 'user',
                    followers: [],
                    following: [],
                    postCount: 0,
                    diamonds: 0,
                    privateProfile: false,
                    acceptsFollowRequests: true,
                    followRequests: [],
                };
                await addDoc(usersCol, { ...newBot, createdAt: serverTimestamp() });
                createdCount++;
            }
        }

        // Create 2 male bots
        for (let i = 0; i < 2; i++) {
            const username = maleUsernames[i] || `erkek_bot_${i}`;
            const existingUserQuery = query(usersCol, where('username', '==', username), where('isBot', '==', true));
            const existingUserSnap = await getDocs(existingUserQuery);
             if (existingUserSnap.empty) {
                const newBot: Omit<UserProfile, 'uid'|'createdAt'> = {
                    username: username,
                    email: `${username}@bot.hiwewalk.com`,
                    photoURL: await fetchRandomAvatar('men', i),
                    isBot: true,
                    bio: bios[6 + i] || "Hayatı dolu dolu yaşa.",
                    gender: 'male',
                    role: 'user',
                    followers: [],
                    following: [],
                    postCount: 0,
                    diamonds: 0,
                    privateProfile: false,
                    acceptsFollowRequests: true,
                    followRequests: [],
                };
                await addDoc(usersCol, { ...newBot, createdAt: serverTimestamp() });
                createdCount++;
            }
        }
        
        return { success: true, createdCount };
    } catch (error: any) {
        console.error("Error creating initial bots:", error);
        return { success: false, error: error.message };
    }
}
