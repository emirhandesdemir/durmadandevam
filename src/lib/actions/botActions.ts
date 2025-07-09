'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getCountFromServer, query, where, serverTimestamp, getDocs, orderBy, limit } from 'firebase/firestore';
import type { BotActivityLog, UserProfile } from '../types';
import { deepSerialize } from '../server-utils';

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

export async function getBotActivityLogs(): Promise<BotActivityLog[]> {
    const logsRef = collection(db, 'botActivityLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(20));
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as BotActivityLog));
    
    return deepSerialize(logs);
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
                const newBotRef = doc(usersCol);
                const newBot: Omit<UserProfile, 'uid' | 'createdAt'> = {
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
                await setDoc(newBotRef, { ...newBot, uid: newBotRef.id, createdAt: serverTimestamp() });
                createdCount++;
            }
        }

        // Create 2 male bots
        for (let i = 0; i < 2; i++) {
            const username = maleUsernames[i] || `erkek_bot_${i}`;
            const existingUserQuery = query(usersCol, where('username', '==', username), where('isBot', '==', true));
            const existingUserSnap = await getDocs(existingUserQuery);
             if (existingUserSnap.empty) {
                const newBotRef = doc(usersCol);
                const newBot: Omit<UserProfile, 'uid' | 'createdAt'> = {
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
                 await setDoc(newBotRef, { ...newBot, uid: newBotRef.id, createdAt: serverTimestamp() });
                createdCount++;
            }
        }
        
        return { success: true, createdCount };
    } catch (error: any) {
        console.error("Error creating initial bots:", error);
        return { success: false, error: error.message };
    }
}
