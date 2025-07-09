
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

const botProfiles = [
    { uid: "bot-elif", username: "Elif Dans", photoURL: "https://randomuser.me/api/portraits/women/68.jpg", userAvatarFrame: "avatar-frame-angel", gender: "female" },
    { uid: "bot-zeynep", username: "Zeynep Gezgin", photoURL: "https://randomuser.me/api/portraits/women/69.jpg", userAvatarFrame: "avatar-frame-devil", gender: "female" },
    { uid: "bot-ayse", username: "Ayşe Şef", photoURL: "https://randomuser.me/api/portraits/women/70.jpg", userAvatarFrame: "avatar-frame-snake", gender: "female" },
    { uid: "bot-fatma", username: "Fatma Sanat", photoURL: "https://randomuser.me/api/portraits/women/71.jpg", userAvatarFrame: "avatar-frame-tech", gender: "female" },
    { uid: "bot-emine", username: "Emine Spor", photoURL: "https://randomuser.me/api/portraits/women/72.jpg", userAvatarFrame: "avatar-frame-premium", gender: "female" },
    { uid: "bot-hatice", username: "Hatice Müzik", photoURL: "https://randomuser.me/api/portraits/women/73.jpg", userAvatarFrame: "", gender: "female" },
    { uid: "bot-merve", username: "Merve Kod", photoURL: "https://randomuser.me/api/portraits/women/74.jpg", userAvatarFrame: "", gender: "female" },
    { uid: "bot-ipek", username: "İpek Doğa", photoURL: "https://randomuser.me/api/portraits/women/75.jpg", userAvatarFrame: "", gender: "female" }
];

const surfVideoCaptions = [
    "Hafta sonu kaçamağı! 🌊☀️ #tatil #deniz",
    "Bu manzaraya karşı kahve keyfi... ☕️ #kahve #huzur",
    "Şehirde bir gün. 🏙️ #istanbul #gezi",
    "Yeni bir tarif denedim, sonuç harika! 😋 #yemek #tarif",
    "Günün en güzel anı. 🌅 #günbatımı #doğa",
    "Bu şarkı modumu anında yükseltiyor! 🎶 #müzik #enerji",
    "Spor zamanı! 💪 #spor #motivasyon",
    "Küçük dostumla tanışın! 🐶❤️ #hayvanlar #sevimli"
];

const surfVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";

/**
 * Belirli aralıklarla çalışarak otomatik olarak bir "Surf" videosu paylaşır.
 */
export const autoPostSurfVideo = functions.region("us-central1").runWith({ memory: '256MB' }).pubsub.schedule('every 3 hours').onRun(async () => {
    try {
        const randomBot = botProfiles[Math.floor(Math.random() * botProfiles.length)];
        const randomCaption = surfVideoCaptions[Math.floor(Math.random() * surfVideoCaptions.length)];

        const postData = {
            uid: randomBot.uid,
            username: randomBot.username,
            userAvatar: randomBot.photoURL,
            userAvatarFrame: randomBot.userAvatarFrame,
            userRole: 'user',
            userGender: randomBot.gender,
            text: randomCaption,
            videoUrl: surfVideoUrl,
            imageUrl: '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            language: 'tr',
            likeCount: 0,
            likes: [],
            commentCount: 0,
            saveCount: 0,
            savedBy: []
        };

        await db.collection('posts').add(postData);
        console.log(`Bot ${randomBot.username} tarafından yeni bir surf videosu paylaşıldı.`);
        return null;
    } catch (error) {
        console.error("Otomatik surf videosu paylaşılırken hata oluştu:", error);
        return null;
    }
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
    // Denetim kaydı oluştur
    const log = {
        type: "user_created",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor: { uid: user.uid, email: user.email, displayName: user.displayName, },
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
        actor: { uid: user.uid, email: user.email, displayName: user.displayName, },
        details: `${user.displayName || user.email || user.uid} hesabı sistemden silindi.`
    };
     await db.collection("auditLogs").add(log);
});
