
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getCountFromServer, query, where, serverTimestamp, getDocs, orderBy, limit, doc, setDoc, updateDoc, writeBatch, increment, arrayUnion } from 'firebase/firestore';
import type { BotActivityLog, UserProfile, GameSettings, Post } from '../types';
import { deepSerialize } from '../server-utils';
import { createNotification } from './notificationActions';

// Helper function
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Predefined bot data
const femaleUsernames = ['Elif Dans', 'Melis Kahve', 'Zeynep Geziyor', 'Ayla Sanat', 'Selin Müzik', 'Derya Güneş'];
const maleUsernames = ['Can Spor', 'Emir Teknoloji'];
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

const botTextPosts = [
    "Bugün biraz kitap okudum 📖 Keyifli bir mola oldu.",
    "Kendime güzel bir kahve yaptım ☕️ Küçük mutluluklar...",
    "Pencereden bakan bir kedi gördüm, günüme neşe kattı 🐱",
    "Yeni bir diziye başladım, saran bir şeyler arıyordum tam da.",
    "Akşam için ne pişirsem diye düşünüyorum, fikirleriniz var mı? 🤔",
];
const botCaptions = [
    "Bugün hava şahane ☀️",
    "Anı yaşa ✨",
    "Hafta sonu enerjisi! 💃",
    "Küçük bir mola.",
    "Günün karesi 📸",
];
const botComments = [
    "Çok güzel paylaşım olmuş 💕",
    "Enerjine bayıldım 😍",
    "Tam benlik bir içerik",
    "Yine harikasın 🫶",
    "Mutlaka devam et 👏👏",
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
        for (let i = 0; i < 6; i++) {
            const username = (femaleUsernames[i] || `kadin_bot_${i}`).replace(' ', '_');
            const existingUserQuery = query(usersCol, where('username', '==', username), where('isBot', '==', true));
            const existingUserSnap = await getDocs(existingUserQuery);
            if (existingUserSnap.empty) {
                const newBotRef = doc(usersCol);
                const newBot: Partial<UserProfile> = {
                    username: username, email: `${username}@bot.hiwewalk.com`, photoURL: await fetchRandomAvatar('women', i),
                    isBot: true, bio: bios[i] || "Yeni maceralar peşinde...", gender: 'female', role: 'user', followers: [], following: [],
                    postCount: 0, diamonds: 0, privateProfile: false, acceptsFollowRequests: true, followRequests: [],
                };
                await setDoc(newBotRef, { ...newBot, uid: newBotRef.id, createdAt: serverTimestamp() });
                createdCount++;
            }
        }
        for (let i = 0; i < 2; i++) {
            const username = (maleUsernames[i] || `erkek_bot_${i}`).replace(' ', '_');
            const existingUserQuery = query(usersCol, where('username', '==', username), where('isBot', '==', true));
            const existingUserSnap = await getDocs(existingUserQuery);
             if (existingUserSnap.empty) {
                const newBotRef = doc(usersCol);
                const newBot: Partial<UserProfile> = {
                    username: username, email: `${username}@bot.hiwewalk.com`, photoURL: await fetchRandomAvatar('men', i),
                    isBot: true, bio: bios[6 + i] || "Hayatı dolu dolu yaşa.", gender: 'male', role: 'user', followers: [],
                    following: [], postCount: 0, diamonds: 0, privateProfile: false, acceptsFollowRequests: true, followRequests: [],
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

export async function getBotAutomationStatus(): Promise<boolean> {
    const settingsRef = doc(db, 'config', 'gameSettings');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        const settings = docSnap.data() as GameSettings;
        return settings.botAutomationEnabled ?? true;
    }
    return true;
}

export async function toggleBotAutomation(enabled: boolean) {
    const settingsRef = doc(db, 'config', 'gameSettings');
    try {
        await setDoc(settingsRef, { botAutomationEnabled: enabled }, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling bot automation:", error);
        return { success: false, error: error.message };
    }
}

// --- Manual Trigger Functions ---

async function getRandomBot(): Promise<UserProfile & { id: string }> {
    const botsQuery = query(collection(db, 'users'), where('isBot', '==', true));
    const botsSnapshot = await getDocs(botsQuery);
    if (botsSnapshot.empty) {
        throw new Error("Sistemde hiç bot bulunamadı.");
    }
    const randomBotDoc = randomElement(botsSnapshot.docs);
    return { id: randomBotDoc.id, ...randomBotDoc.data() } as UserProfile & { id: string };
}

async function getRandomPost(excludeBotId?: string) {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const postsSnapshot = await getDocs(postsQuery);
    if (postsSnapshot.empty) throw new Error("Etkileşim yapılacak gönderi bulunamadı.");
    
    let eligibleDocs = postsSnapshot.docs;
    if (excludeBotId) {
        eligibleDocs = postsSnapshot.docs.filter(doc => doc.data().uid !== excludeBotId);
    }
    if (eligibleDocs.length === 0) throw new Error("Etkileşime girilecek uygun gönderi bulunamadı.");

    const randomPostDoc = randomElement(eligibleDocs);
    return { id: randomPostDoc.id, ref: randomPostDoc.ref, data: randomPostDoc.data() as Post };
}

async function logBotActivity(logData: Omit<BotActivityLog, 'id' | 'timestamp'>) {
    await addDoc(collection(db, 'botActivityLogs'), {
        ...logData,
        timestamp: serverTimestamp(),
    });
}

export async function triggerBotPostNow(contentType: 'image' | 'text' | 'video') {
    const botUser = await getRandomBot();
    
    const newPost: Partial<Post> = {
        uid: botUser.id, username: botUser.username, userAvatar: botUser.photoURL, userAvatarFrame: botUser.selectedAvatarFrame || '',
        userRole: 'user', userGender: 'female', createdAt: serverTimestamp(), likeCount: 0, commentCount: 0, saveCount: 0, likes: [], savedBy: [], tags: [], isBotPost: true
    };

    const typeMap = { image: 'görsel', text: 'metin', video: 'video' };

    switch(contentType) {
        case 'image': newPost.imageUrl = `https://picsum.photos/600/800?random=${Date.now()}`; newPost.text = randomElement(botCaptions); break;
        case 'video': newPost.videoUrl = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'; newPost.text = randomElement(botCaptions); break;
        default: newPost.text = randomElement(botTextPosts); newPost.imageUrl = ''; newPost.videoUrl = ''; break;
    }
    
    const postRef = await addDoc(collection(db, 'posts'), newPost);
    await logBotActivity({ botId: botUser.id, botUsername: botUser.username, actionType: `post_${contentType}`, targetPostId: postRef.id });

    return { success: true, message: `Bot ${botUser.username} anlık olarak bir ${typeMap[contentType]} gönderisi paylaştı.` };
}

export async function triggerBotLikeNow() {
    const botUser = await getRandomBot();
    const { id: postId, ref: postRef, data: postData } = await getRandomPost(botUser.id);
    
    await updateDoc(postRef, {
        likeCount: increment(1),
        likes: arrayUnion(botUser.id)
    });
    
    await createNotification({ recipientId: postData.uid, senderId: botUser.id, senderUsername: botUser.username, senderAvatar: botUser.photoURL, type: 'like', postId: postId, postImage: postData.imageUrl || null });
    await logBotActivity({ botId: botUser.id, botUsername: botUser.username, actionType: 'like', targetPostId: postId, targetUserId: postData.uid, targetUsername: postData.username });

    return { success: true, message: `Bot ${botUser.username}, ${postData.username} kullanıcısının gönderisini beğendi.` };
}

export async function triggerBotCommentNow() {
    const botUser = await getRandomBot();
    const { id: postId, ref: postRef, data: postData } = await getRandomPost(botUser.id);
    
    const commentText = randomElement(botComments);
    const newComment = {
        uid: botUser.id, username: botUser.username, userAvatar: botUser.photoURL,
        text: commentText, createdAt: serverTimestamp(), userRole: 'user',
    };

    await addDoc(collection(postRef, 'comments'), newComment);
    await updateDoc(postRef, { commentCount: increment(1) });
    
    await createNotification({ recipientId: postData.uid, senderId: botUser.id, senderUsername: botUser.username, senderAvatar: botUser.photoURL, type: 'comment', postId, commentText });
    await logBotActivity({ botId: botUser.id, botUsername: botUser.username, actionType: 'comment', targetPostId: postId, targetUserId: postData.uid, targetUsername: postData.username, commentText });

    return { success: true, message: `Bot ${botUser.username}, ${postData.username} kullanıcısının gönderisine yorum yaptı.` };
}
