// Bu dosya, Firebase projesinin sunucu tarafı mantığını içerir.
// Veritabanındaki belirli olaylara (örn: yeni bildirim oluşturma) tepki vererek
// anlık bildirim gönderme gibi işlemleri gerçekleştirir.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { GameSettings, BotState, FeatureFlags } from "./types"; // We need a types file in functions folder
import { getChatId } from "./utils";


// Firebase Admin SDK'sını başlat. Bu, sunucu tarafında Firebase servislerine erişim sağlar.
admin.initializeApp();

// Firestore veritabanı örneğini al.
const db = admin.firestore();

// OneSignal konfigürasyonu.
const ONE_SIGNAL_APP_ID = "51c67432-a305-43fc-a4c8-9c5d9d478d1c";
const ONE_SIGNAL_REST_API_KEY = "os_v2_app_khdhimvdavb7zjgitroz2r4ndrkixk2biw6eqrfn4oygor7fxogtw3riv5mjpu4koeuuju6ma2scefend3lqkwij53ppdzbngmbouvy";


const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Botlar için önceden tanımlanmış içerikler
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

const getSystemConfig = async (): Promise<{ settings: GameSettings; state: BotState; flags: FeatureFlags; }> => {
    const settingsDoc = await db.collection('config').doc('gameSettings').get();
    const stateDoc = await db.collection('config').doc('botState').get();
    const flagsDoc = await db.collection('config').doc('featureFlags').get();
    
    const defaultSettings: GameSettings = {
        dailyDiamondLimit: 50, gameIntervalMinutes: 5, questionTimerSeconds: 15, rewardAmount: 5, cooldownSeconds: 30, afkTimeoutMinutes: 8, imageUploadQuality: 0.9, audioBitrate: 64, videoBitrate: 1000, botPostIntervalMinutes: 60, botInteractIntervalMinutes: 30, botRoomJoinIntervalMinutes: 10, maxBotsPerRoom: 3
    };

    const defaultFlags: FeatureFlags = {
        quizGameEnabled: true, postFeedEnabled: true, contentModerationEnabled: true,
        botNewUserOnboardEnabled: true, botAutoPostEnabled: true, botAutoInteractEnabled: true, botAutoRoomInteractEnabled: true,
    };

    return {
        settings: { ...defaultSettings, ...settingsDoc.data() },
        state: stateDoc.data() || {},
        flags: { ...defaultFlags, ...flagsDoc.data() },
    };
};

const logBotActivity = async (logData: any) => {
    await db.collection('botActivityLogs').add({
        ...logData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
};

// BOT İÇERİK PAYLAŞIM FONKSİYONU
export const botPostContent = functions.region("us-central1").pubsub.schedule('every 5 minutes').onRun(async (context) => {
    const { settings, state, flags } = await getSystemConfig();
    if (!flags.botAutoPostEnabled) {
        console.log("Bot otomasyonu (paylaşım) devre dışı, işlem atlanıyor.");
        return null;
    }
    
    const now = Date.now();
    const lastRun = state.lastPostRun?.toMillis() || 0;
    const intervalMillis = (settings.botPostIntervalMinutes || 60) * 60 * 1000;

    if (now - lastRun < intervalMillis) {
        return null;
    }

    console.log('Bot içerik paylaşım fonksiyonu tetiklendi.');
    const botsQuery = db.collection('users').where('isBot', '==', true).where('gender', '==', 'female');
    const botsSnapshot = await botsQuery.get();
    if (botsSnapshot.empty) {
        console.log("Paylaşım yapacak bot bulunamadı.");
        return null;
    }
    const botDocs = botsSnapshot.docs;
    const randomBotDoc = randomElement(botDocs);
    const botUser = { id: randomBotDoc.id, ...randomBotDoc.data() };
    const contentType = randomElement(['video', 'video', 'image', 'text']); // Prioritize video

    const newPost: any = {
        uid: botUser.id, username: botUser.username, userAvatar: botUser.photoURL, userAvatarFrame: botUser.selectedAvatarFrame || '',
        userRole: 'user', userGender: 'female', createdAt: admin.firestore.FieldValue.serverTimestamp(),
        likeCount: 0, commentCount: 0, saveCount: 0, likes: [], savedBy: [], tags: [], isBotPost: true, videoUrl: '', imageUrl: '',
    };
    
    switch(contentType) {
        case 'image': newPost.imageUrl = `https://placehold.co/600x800.png`; newPost.text = randomElement(botCaptions); break;
        case 'video': newPost.videoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'; newPost.text = randomElement(botCaptions); break;
        default: 
            newPost.text = randomElement(botTextPosts);
            newPost.imageUrl = '';
            newPost.videoUrl = '';
            break;
    }
    
    const postRef = await db.collection('posts').add(newPost);
    await db.collection('config').doc('botState').set({ lastPostRun: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    
    await logBotActivity({
        botId: botUser.id,
        botUsername: botUser.username,
        actionType: `post_${contentType}`,
        targetPostId: postRef.id,
    });
    console.log(`Bot ${botUser.username} yeni bir ${contentType} gönderisi paylaştı.`);
    return null;
});


// BOT ETKİLEŞİM FONKSİYONU
export const botInteract = functions.region("us-central1").pubsub.schedule('every 5 minutes').onRun(async (context) => {
    const { settings, state, flags } = await getSystemConfig();
    if (!flags.botAutoInteractEnabled) {
        console.log("Bot otomasyonu (etkileşim) devre dışı, işlem atlanıyor.");
        return null;
    }

    const now = Date.now();
    const lastRun = state.lastInteractRun?.toMillis() || 0;
    const intervalMillis = (settings.botInteractIntervalMinutes || 30) * 60 * 1000;

    if (now - lastRun < intervalMillis) {
        return null;
    }

    console.log('Bot etkileşim fonksiyonu tetiklendi.');
    const botsQuery = db.collection('users').where('isBot', '==', true);
    const botsSnapshot = await botsQuery.get();
    if (botsSnapshot.empty) return null;
    const randomBotDoc = randomElement(botsSnapshot.docs);
    const botUser = { id: randomBotDoc.id, ...randomBotDoc.data() } as any;

    const postsQuery = db.collection('posts').where('isBotPost', '!=', true).orderBy('isBotPost').orderBy('createdAt', 'desc').limit(20);
    const postsSnapshot = await postsQuery.get();
    if (postsSnapshot.empty) return null;
    const randomPostDoc = randomElement(postsSnapshot.docs);
    const postRef = randomPostDoc.ref;
    const postData = randomPostDoc.data();
    if (!postData || postData.uid === botUser.id) return;

    if (!postData.likes || !postData.likes.includes(botUser.id)) {
        await postRef.update({
            likeCount: admin.firestore.FieldValue.increment(1),
            likes: admin.firestore.FieldValue.arrayUnion(botUser.id)
        });
        await admin.firestore().collection('users').doc(postData.uid).collection('notifications').add({
            senderId: botUser.id, senderUsername: botUser.username, senderAvatar: botUser.photoURL, senderAvatarFrame: botUser.selectedAvatarFrame || '',
            type: 'like', postId: randomPostDoc.id, postImage: postData.imageUrl || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(), read: false,
        });
        await logBotActivity({ botId: botUser.id, botUsername: botUser.username, actionType: 'like', targetPostId: randomPostDoc.id, targetUserId: postData.uid, targetUsername: postData.username });
    }

    const commentText = randomElement(botComments);
    await postRef.collection('comments').add({
        uid: botUser.id, username: botUser.username, userAvatar: botUser.photoURL, userAvatarFrame: botUser.selectedAvatarFrame || '',
        text: commentText, createdAt: admin.firestore.FieldValue.serverTimestamp(), userRole: 'user',
    });
    await postRef.update({ commentCount: admin.firestore.FieldValue.increment(1) });
    await admin.firestore().collection('users').doc(postData.uid).collection('notifications').add({
        senderId: botUser.id, senderUsername: botUser.username, senderAvatar: botUser.photoURL, senderAvatarFrame: botUser.selectedAvatarFrame || '',
        type: 'comment', postId: randomPostDoc.id, commentText: commentText, postImage: postData.imageUrl || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), read: false,
    });
    await logBotActivity({ botId: botUser.id, botUsername: botUser.username, actionType: 'comment', targetPostId: randomPostDoc.id, targetUserId: postData.uid, targetUsername: postData.username, commentText });
    
    await db.collection('config').doc('botState').set({ lastInteractRun: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log(`Bot ${botUser.username}, ${postData.username} kullanıcısının gönderisiyle etkileşimde bulundu.`);
    return null;
});


/**
 * 'broadcasts' koleksiyonuna yeni bir belge eklendiğinde tetiklenir.
 * OneSignal kullanarak abone olan tüm kullanıcılara anlık bildirim gönderir.
 */
export const onBroadcastCreate = functions.region("us-central1").firestore
    .document("broadcasts/{broadcastId}")
    .onCreate(async (snapshot) => {
        const broadcastData = snapshot.data();
        if (!broadcastData) {
            console.log("Yayın verisi boş.");
            return;
        }

        const { title, body, link } = broadcastData;
        console.log("Yeni yayın alındı:", JSON.stringify(broadcastData, null, 2));

        if (!ONE_SIGNAL_REST_API_KEY) {
            console.error("OneSignal REST API Anahtarı yapılandırılmamış.");
            return;
        }

        const oneSignalPayload = {
            app_id: ONE_SIGNAL_APP_ID,
            included_segments: ["Subscribed Users"],
            headings: { "en": title, "tr": title },
            contents: { "en": body, "tr": body },
            web_url: `https://yenidendeneme-ea9ed.web.app${link || '/'}`,
        };
        
        console.log("Yayın yükü OneSignal'a gönderiliyor:", JSON.stringify(oneSignalPayload, null, 2));

        try {
            const response = await axios.post("https://onesignal.com/api/v1/notifications", oneSignalPayload, {
                headers: {
                    "Authorization": `Basic ${ONE_SIGNAL_REST_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
            console.log(`[OneSignal Başarılı] Yayın gönderildi. Yanıt:`, response.data);
        } catch (error: any) {
            console.error(`[OneSignal Hatası] Yayın gönderilemedi. Durum: ${error.response?.status}. Yanıt:`,
                error.response?.data || error.message);
        }
    });


/**
 * Yeni bir bildirim dokümanı oluşturulduğunda tetiklenir.
 * OneSignal REST API'sini kullanarak bir anlık bildirim gönderir.
 */
export const sendPushNotification = functions.region("us-central1").firestore
    .document("users/{userId}/notifications/{notificationId}")
    .onCreate(async (snapshot, context) => {
        const userId = context.params.userId;
        console.log(`[Fonksiyon Tetiklendi] Kullanıcı: ${userId}. Bildirim ID: ${context.params.notificationId}`);
        
        const notificationData = snapshot.data();
        console.log("Bildirim Verisi:", JSON.stringify(notificationData, null, 2));

        if (!ONE_SIGNAL_REST_API_KEY) {
            console.error("OneSignal REST API Anahtarı yapılandırılmamış.");
            return;
        }

        if (!notificationData) {
            console.log("Bildirim verisi bulunamadı.");
            return;
        }

        let title = "Yeni bir bildiriminiz var!";
        let body = "Uygulamayı açarak kontrol edin.";
        let link = "/notifications"; // Varsayılan link

        switch (notificationData.type) {
             case "like":
                title = "Yeni Beğeni 👍";
                body = `${notificationData.senderUsername} gönderinizi beğendi.`;
                link = `/notifications`;
                break;
            case "comment":
                title = "Yeni Yorum 💬";
                body = `${notificationData.senderUsername} gönderinize yorum yaptı: "${notificationData.commentText}"`;
                link = `/notifications`;
                break;
            case "follow":
                title = "Yeni Takipçi 🎉";
                body = `${notificationData.senderUsername} sizi takip etmeye başladı.`;
                link = `/profile/${notificationData.senderId}`;
                break;
            case "follow_accept":
                title = "Takip İsteği Kabul Edildi ✅";
                body = `${notificationData.senderUsername} takip isteğinizi kabul etti.`;
                link = `/profile/${notificationData.senderId}`;
                break;
            case "mention":
                title = "Biri Sizden Bahsetti! 📣";
                body = `${notificationData.senderUsername} bir gönderide sizden bahsetti.`;
                link = `/notifications`;
                break;
            case "room_invite":
                title = "Oda Daveti 🚪";
                body = `${notificationData.senderUsername} sizi "${notificationData.roomName}" odasına davet etti.`;
                link = `/rooms/${notificationData.roomId}`;
                break;
            case "dm_message":
                title = `Yeni Mesaj ✉️`;
                body = `${notificationData.senderUsername}: ${notificationData.messageText}`;
                link = `/dm/${notificationData.chatId}`;
                break;
            case "diamond_transfer":
                title = "Elmas Aldınız! 💎";
                body = `${notificationData.senderUsername} size ${notificationData.diamondAmount} elmas gönderdi!`;
                link = `/profile/${notificationData.senderId}`;
                break;
            case "referral_bonus":
                title = "Davet Ödülü! 🎉";
                body = `${notificationData.senderUsername} davetinizle katıldı ve size ${notificationData.diamondAmount} elmas kazandırdı!`;
                link = `/profile/${notificationData.senderId}`;
                break;
            case "retweet":
                title = "Yeni Retweet 🔁";
                body = `${notificationData.senderUsername} gönderinizi retweetledi.`;
                link = '/notifications';
                break;
            case "call_incoming":
                const callType = notificationData.callType === 'video' ? 'Görüntülü' : 'Sesli';
                title = `📞 Gelen ${callType} Arama`;
                body = `${notificationData.senderUsername} sizi arıyor...`;
                link = `/call/${notificationData.callId || ''}`;
                break;
            case "call_missed":
                title = `📞 Cevapsız Arama`;
                body = `${notificationData.senderUsername} sizi aradı.`;
                link = `/dm`; // Link to DM list
                break;
            case "complete_profile":
                title = "Profilini Tamamla! ✨";
                body = "Profiline bir biyografi ekleyerek insanların seni daha iyi tanımasını sağla.";
                link = "/profile";
                break;
        }

        const oneSignalPayload: { [key: string]: any } = {
            app_id: ONE_SIGNAL_APP_ID,
            include_external_user_ids: [userId],
            headings: { "en": title, "tr": title },
            contents: { "en": body, "tr": body },
            web_url: `https://yenidendeneme-ea9ed.web.app${link}`,
            data: { // Add custom data for in-app navigation
                notificationType: notificationData.type,
                relatedId: notificationData.postId || notificationData.roomId || notificationData.chatId || notificationData.senderId
            }
        };

        if (notificationData.postImage) {
            oneSignalPayload.big_picture = notificationData.postImage;
            oneSignalPayload.chrome_web_image = notificationData.postImage;
        }
        
        console.log("Yük OneSignal'a gönderiliyor:", JSON.stringify(oneSignalPayload, null, 2));

        try {
            const response = await axios.post("https://onesignal.com/api/v1/notifications", oneSignalPayload, {
                headers: {
                    "Authorization": `Basic ${ONE_SIGNAL_REST_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
            console.log(`[OneSignal Başarılı] Kullanıcıya gönderildi ${userId}. Yanıt:`, response.data);
        } catch (error: any) {
            console.error(`[OneSignal Hatası] Kullanıcıya gönderilemedi ${userId}:`,
                error.response?.data || error.message);
        }
    });

/**
 * Firebase Authentication'da yeni bir kullanıcı oluşturulduğunda tetiklenir.
 * Kullanıcı oluşturma olayı için bir denetim kaydı (audit log) oluşturur.
 * Ayrıca yeni kullanıcıya botların takip isteği göndermesini ve DM atmasını sağlar.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    // Denetim kaydı oluştur
    const log = {
        type: "user_created",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor: { uid: user.uid, email: user.email, displayName: user.displayName, },
        details: `${user.displayName || user.email || user.uid} sisteme kayıt oldu.`
    };
    await db.collection("auditLogs").add(log);

    // Yeni kullanıcı bot ise işlemi durdur.
    const userSnap = await db.collection('users').doc(user.uid).get();
    if(userSnap.exists() && userSnap.data()?.isBot) {
        return;
    }

    const { flags } = await getSystemConfig();
    if (!flags.botNewUserOnboardEnabled) {
        console.log("Yeni kullanıcı için bot etkileşimi devre dışı.");
        return;
    }

    // Rastgele 5 bot seç
    const botsQuery = db.collection('users').where('isBot', '==', true);
    const botsSnapshot = await botsQuery.get();
    if (botsSnapshot.empty) return;
    
    // Shuffle and pick 5
    const allBots = botsSnapshot.docs;
    const shuffledBots = allBots.sort(() => 0.5 - Math.random());
    const selectedBots = shuffledBots.slice(0, 5);
    
    if (selectedBots.length === 0) return;

    const batch = db.batch();
    const newUserRef = db.collection('users').doc(user.uid);

    for (const botDoc of selectedBots) {
        const botUser = { id: botDoc.id, ...botDoc.data() } as any;
        const botRef = db.collection('users').doc(botUser.id);
        batch.update(botRef, { following: admin.firestore.FieldValue.arrayUnion(user.uid) });
        batch.update(newUserRef, { followers: admin.firestore.FieldValue.arrayUnion(botUser.id) });
        await logBotActivity({ botId: botUser.id, botUsername: botUser.username, actionType: 'follow', targetUserId: user.uid, targetUsername: user.displayName });
    }

    await batch.commit();

    // Seçilen botlardan biri DM göndersin
    const randomDmBotDoc = randomElement(selectedBots);
    const dmBot = { id: randomDmBotDoc.id, ...randomDmBotDoc.data() } as any;
    const chatId = getChatId(dmBot.id, user.uid);
    const dmMessage = randomElement(welcomeDms);

    await db.collection('directMessages').doc(chatId).collection('messages').add({
        senderId: dmBot.id, receiverId: user.uid, text: dmMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), read: false,
    });
    
    const metadataRef = db.collection('directMessagesMetadata').doc(chatId);
    await metadataRef.set({
        participantUids: [dmBot.id, user.uid],
        participantInfo: {
            [dmBot.id]: { username: dmBot.username, photoURL: dmBot.photoURL },
            [user.uid]: { username: user.displayName, photoURL: user.photoURL },
        },
        lastMessage: { text: dmMessage, senderId: dmBot.id, timestamp: admin.firestore.FieldValue.serverTimestamp(), read: false },
        unreadCounts: { [user.uid]: 1, [dmBot.id]: 0 },
    }, { merge: true });
    
    await logBotActivity({ botId: dmBot.id, botUsername: dmBot.username, actionType: 'dm_sent', targetUserId: user.uid, targetUsername: user.displayName });
});


/**
 * Firebase Authentication'dan bir kullanıcı silindiğinde tetiklenir.
 * Kullanıcı silme olayı için bir denetim kaydı oluşturur.
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
    const log = {
        type: "user_deleted",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor: { uid: user.uid, email: user.email, displayName: user.displayName, },
        details: `${user.displayName || user.email || user.uid} hesabı sistemden silindi.`
    };
     await db.collection("auditLogs").add(log);
});
