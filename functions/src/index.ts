// Bu dosya, Firebase projesinin sunucu tarafı mantığını içerir.
// Veritabanındaki belirli olaylara (örn: yeni bildirim oluşturma) tepki vererek
// anlık bildirim gönderme gibi işlemleri gerçekleştirir.
import { onDocumentCreated, FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { onUserCreated, onUserDeleted, AuthEvent } from "firebase-functions/v2/auth";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Firebase Admin SDK'sını başlat. Bu, sunucu tarafında Firebase servislerine erişim sağlar.
admin.initializeApp();

// Firestore veritabanı örneğini al.
const db = admin.firestore();

// OneSignal konfigürasyonu.
// GÜVENLİK NOTU: Bu anahtarın doğrudan koda eklenmesi, geçici bir çözümdür.
// İdeal olarak, `firebase functions:config:set` komutuyla ayarlanmalıdır.
const ONE_SIGNAL_APP_ID = "51c67432-a305-43fc-a4c8-9c5d9d478d1c";
const ONE_SIGNAL_REST_API_KEY = "os_v2_app_khdhimvdavb7zjgitroz2r4ndrkixk2biw6eqrfn4oygor7fxogtw3riv5mjpu4koeuuju6ma2scefend3lqkwij53ppdzbngmbouvy";


/**
 * Yeni bir bildirim dokümanı oluşturulduğunda tetiklenir.
 * OneSignal REST API'sini kullanarak bir anlık bildirim gönderir.
 */
export const sendPushNotification = onDocumentCreated(
    {
        document: "users/{userId}/notifications/{notificationId}",
        region: "us-central1"
    },
    async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { userId: string, notificationId: string }>) => {
        const snapshot = event.data;
        if (!snapshot) {
            logger.info("No data associated with the event, skipping.");
            return;
        }

        const notificationData = snapshot.data();
        if (!notificationData) {
            logger.info("Bildirim verisi bulunamadı.");
            return;
        }
        
        const userId = event.params.userId;
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
        }

        const oneSignalPayload = {
            app_id: ONE_SIGNAL_APP_ID,
            include_external_user_ids: [userId],
            headings: { "en": title, "tr": title },
            contents: { "en": body, "tr": body },
            web_url: `https://yenidendeneme-ea9ed.web.app${link}`,
        };

        try {
            const response = await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${ONE_SIGNAL_REST_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(oneSignalPayload),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            logger.info(`OneSignal notification sent to user ${userId}`);
        } catch (error) {
            logger.error(`Error sending OneSignal notification to user ${userId}:`, error);
        }
    }
);


/**
 * Firebase Authentication'da yeni bir kullanıcı oluşturulduğunda tetiklenir.
 * Kullanıcı oluşturma olayı için bir denetim kaydı (audit log) oluşturur.
 */
export const onUserCreate = onUserCreated(async (event: AuthEvent) => {
    const user = event.data;
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
export const onUserDelete = onUserDeleted(async (event: AuthEvent) => {
    const user = event.data;
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


export const onMessageCreate = onDocumentCreated("rooms/{roomId}/messages/{messageId}", async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { roomId: string, messageId: string }>) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.info("No data in onMessageCreate event.");
      return;
    }
    
    const message = snapshot.data();
    const { roomId } = event.params;

    if (message.text && message.text.toLowerCase().includes('@walk')) {
      const historySnapshot = await db.collection(`rooms/${roomId}/messages`)
        .orderBy('createdAt', 'desc')
        .where('createdAt', '<', message.createdAt)
        .limit(10)
        .get();

      const history = historySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              author: data.uid === 'ai-bot-walk' ? 'model' : 'user',
              content: data.text
          };
      }).reverse();

      const isGreeting = /^(selam|merhaba|hey|hi|sa)\b/i.test(message.text.replace(/@walk/i, '').trim());

      try {
        const { roomBotFlow } = await import('./flows/roomBotFlow.js');
        const responseText = await roomBotFlow({
            history,
            currentMessage: message.text,
            isGreeting,
            authorUsername: message.username,
        });

        const svg = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="url(#bot-grad)"/><rect x="25" y="45" width="50" height="20" rx="10" fill="white" fill-opacity="0.8"/><circle cx="50" cy="40" r="15" fill="white"/><circle cx="50" cy="40" r="10" fill="url(#eye-grad)"/><path d="M35 70 Q 50 80, 65 70" stroke="white" stroke-width="4" stroke-linecap="round" fill="none"/><defs><linearGradient id="bot-grad" x1="0" y1="0" x2="100" y2="100"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#3b82f6"/></linearGradient><radialGradient id="eye-grad"><stop offset="20%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#2563eb"/></radialGradient></defs></svg>`;
        
        await db.collection(`rooms/${roomId}/messages`).add({
            uid: 'ai-bot-walk',
            username: 'Walk',
            photoURL: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
            selectedAvatarFrame: 'avatar-frame-tech',
            text: responseText,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'user',
        });
      } catch (error) {
        logger.error("Error running roomBotFlow:", error);
      }
    }
});
