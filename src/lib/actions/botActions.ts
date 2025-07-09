// src/lib/actions/botActions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getCountFromServer, query, where, serverTimestamp, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import type { BotActivityLog, UserProfile, Post } from '../types';
import { deepSerialize } from '../server-utils';

// Helper function
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Predefined bot data
const bios = [
    "Kahve ve kitap tutkunu ☕📚",
    "Dans etmeyi çok seviyorum 💃",
    "Mutlu anlar biriktiriyorum ✨",
    "Yeni yerler keşfetmek en büyük hobim 🌍",
    "Müzik ruhun gıdasıdır 🎶",
    "Hayatı akışına bırakıyorum 🧘‍♀️",
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
const welcomeDms = [
    "Selam, uygulamaya hoş geldin! 🎉 Umarız harika vakit geçirirsin.",
    "Merhaba! Aramıza katıldığın için çok mutluyuz. 😊",
    "Hoş geldin! Yardıma ihtiyacın olursa çekinme. 🙋‍♀️",
    "Naber? Uygulamayı keşfetmeye başla, harika şeyler var!",
    "Selam, yeni bir yüz görmek ne güzel! Hadi bir oda oluştur da görelim seni.",
];

const femaleFirstNames = [
    'Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Meryem', 'Şerife', 'Sultan', 'Zehra',
    'Hanife', 'Zeliha', 'Havva', 'Songül', 'Leyla', 'Yasemin', 'Derya', 'Gülcan', 'Sevim', 'Sibel',
    'Bahar', 'Deniz', 'Eylül', 'Gizem', 'İrem', 'Melike', 'Pınar', 'Seda', 'Tuğba', 'Yağmur'
];
const turkishLastNames = [
    'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir',
    'Arslan', 'Doğan', 'Kılıç', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özcan', 'Polat', 'Tekin'
];

const generateFallbackAvatar = (seed: string) => {
    const getHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return Math.abs(hash);
    };

    const hash = getHash(seed);
    const hue = hash % 360;
    const saturation = 70 + (hash % 10);
    const lightness = 45 + (hash % 10);
    const lightness2 = lightness + 15;

    const svg = `
<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="200" height="200" fill="url(#gradient)"/>
<defs>
<radialGradient id="gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
<stop offset="0%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness2}%);stop-opacity:1" />
<stop offset="100%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness}%);stop-opacity:1" />
</radialGradient>
</defs>
</svg>`.replace(/\n/g, "").replace(/\s+/g, " ");

    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

async function generateUniqueBotUsername(): Promise<string> {
    let username = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 20) {
        const randomFirstName = randomElement(femaleFirstNames);
        const randomLastName = randomElement(turkishLastNames);
        username = `${randomFirstName} ${randomLastName}`;
        
        const existingUserQuery = query(collection(db, 'users'), where('username', '==', username));
        const existingUserSnap = await getDocs(existingUserQuery);
        
        if (existingUserSnap.empty) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        return `BotUser${Date.now()}`;
    }

    return username;
}


export async function getBots(): Promise<UserProfile[]> {
    const botsQuery = query(collection(db, 'users'), where('isBot', '==', true));
    const snapshot = await getDocs(botsQuery);
    const bots = snapshot.docs.map(doc => doc.data() as UserProfile);
    return deepSerialize(bots);
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
    const botsToCreate = 8; // Create 8 new bots each time

    try {
        const usersCol = collection(db, 'users');
        const batch = writeBatch(db);

        for (let i = 0; i < botsToCreate; i++) {
            const username = await generateUniqueBotUsername();
            
            const newBotRef = doc(usersCol);
            const seed = username.replace(/\s+/g, '').toLowerCase();
            let photoURL = '';

            try {
                const response = await fetch(`https://randomuser.me/api/?gender=female&seed=${seed}`);
                if (!response.ok) {
                    throw new Error(`API responded with status ${response.status}`);
                }
                const data = await response.json();
                photoURL = data.results[0]?.picture?.large;

                if (!photoURL) {
                    throw new Error("No picture URL found in API response.");
                }
            } catch (apiError: any) {
                console.warn(`Could not fetch avatar for ${username} from API: ${apiError.message}. Using fallback.`);
                photoURL = generateFallbackAvatar(seed);
            }

            const newBot: Partial<UserProfile> = {
                username: username,
                email: `${seed}@bot.hiwewalk.com`,
                photoURL: photoURL,
                isBot: true,
                bio: randomElement(bios),
                gender: 'female',
                role: 'user',
                followers: [],
                following: [],
                postCount: 0,
                diamonds: 0,
                privateProfile: false,
                acceptsFollowRequests: true,
                followRequests: [],
                uid: newBotRef.id,
                createdAt: serverTimestamp() as any,
            };
            batch.set(newBotRef, newBot);
            createdCount++;
        }

        await batch.commit();

        return { success: true, createdCount };
    } catch (error: any) {
        console.error("Error creating initial bots:", error);
        return { success: false, error: error.message };
    }
}


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
        eligibleDocs = postsSnapshot.docs.filter(doc => doc.data().uid !== excludeBotId && !doc.data().isBotPost);
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
        userRole: 'user', userGender: 'female', createdAt: serverTimestamp(), likeCount: 0, commentCount: 0, saveCount: 0, likes: [], savedBy: [], tags: [], isBotPost: true,
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
