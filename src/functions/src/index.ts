// Bu dosya, Firebase projesinin sunucu tarafı mantığını içerir.
// Veritabanındaki belirli olaylara (örn: yeni bildirim oluşturma) tepki vererek
// anlık bildirim gönderme gibi işlemleri gerçekleştirir.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

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

// BOT İÇERİK PAYLAŞIM FONKSİYONU (SAATLİK)
export const botPostContent = functions.region("us-central1").pubsub.schedule('every 1 hours').onRun(async (context) => {
    console.log('Bot içerik paylaşım fonksiyonu tetiklendi.');
    
    // Rastgele bir kadın bot kullanıcı seç
    const botsQuery = db.collection('users').where('isBot', '==', true).where('gender', '==', 'female');
    const botsSnapshot = await botsQuery.get();
    if (botsSnapshot.empty) {
        console.log("Paylaşım yapacak bot bulunamadı.");
        return null;
    }
    const botDocs = botsSnapshot.docs;
    const randomBotDoc = randomElement(botDocs);
    const botUser = { id: randomBotDoc.id, ...randomBotDoc.data() };

    // Rastgele bir içerik türü seç
    const contentType = randomElement(['image', 'text', 'video']);

    const newPost: any = {
        uid: botUser.id,
        username: botUser.username,
        userAvatar: botUser.photoURL,
        userAvatarFrame: botUser.selectedAvatarFrame || '',
        userRole: 'user',
        userGender: 'female',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        likes: [],
        savedBy: [],
        tags: [],
    };

    switch(contentType) {
        case 'image':
            newPost.type = 'image';
            newPost.imageUrl = `https://picsum.photos/600/800?random=${Date.now()}`;
            newPost.text = randomElement(botCaptions);
            break;
        case 'video':
            newPost.type = 'video';
            newPost.videoUrl = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';
            newPost.text = randomElement(botCaptions);
            break;
        case 'text':
        default:
            newPost.type = 'text';
            newPost.text = randomElement(botTextPosts);
            break;
    }
    
    await db.collection('posts').add(newPost);
    console.log(`Bot ${botUser.username} yeni bir ${contentType} gönderisi paylaştı.`);
    return null;
});


// BOT ETKİLEŞİM FONKSİYONU (15 DAKİKADA BİR)
export const botInteract = functions.region("us-central1").pubsub.schedule('every 15 minutes').onRun(async (context) => {
     console.log('Bot etkileşim fonksiyonu tetiklendi.');
     
    // Rastgele bir kadın bot kullanıcı seç
    const botsQuery = db.collection('users').where('isBot', '==', true).where('gender', '==', 'female');
    const botsSnapshot = await botsQuery.get();
    if (botsSnapshot.empty) {
        console.log("Etkileşim yapacak bot bulunamadı.");
        return null;
    }
    const botDocs = botsSnapshot.docs;
    const randomBotDoc = randomElement(botDocs);
    const botUser = { id: randomBotDoc.id, ...randomBotDoc.data() };

    // Rastgele bir gönderi seç (botun kendi gönderisi olmasın)
    const postsQuery = db.collection('posts').where('uid', '!=', botUser.id);
    const postsSnapshot = await postsQuery.get();
    if (postsSnapshot.empty) {
        console.log("Etkileşim yapılacak gönderi bulunamadı.");
        return null;
    }
    const postDocs = postsSnapshot.docs;
    const randomPostDoc = randomElement(postDocs);
    const postRef = randomPostDoc.ref;

    const postData = randomPostDoc.data();
    if (!postData) return;

    // Beğenme işlemi
    if (!postData.likes || !postData.likes.includes(botUser.id)) {
        await postRef.update({
            likeCount: admin.firestore.FieldValue.increment(1),
            likes: admin.firestore.FieldValue.arrayUnion(botUser.id)
        });
        console.log(`Bot ${botUser.username}, ${postData.username} kullanıcısının gönderisini beğendi.`);
    }

    // Yorum yapma işlemi
    const newComment = {
        uid: botUser.id,
        username: botUser.username,
        userAvatar: botUser.photoURL,
        text: randomElement(botComments),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await postRef.collection('comments').add(newComment);
    await postRef.update({
        commentCount: admin.firestore.FieldValue.increment(1)
    });
    console.log(`Bot ${botUser.username}, ${postData.username} kullanıcısının gönderisine yorum yaptı.`);

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
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const log = {
        type: "user_created",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
        },
        details: `${user.displayName || user.email || user.uid} sisteme kayıt oldu.`
    };
    await db.collection("auditLogs").add(log);
});

/**
 * Firebase Authentication'dan bir kullanıcı silindiğinde tetiklenir.
 * Kullanıcı silme olayı için bir denetim kaydı oluşturur.
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
    const log = {
        type: "user_deleted",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
        },
        details: `${user.displayName || user.email || user.uid} hesabı sistemden silindi.`
    };
     await db.collection("auditLogs").add(log);
});
