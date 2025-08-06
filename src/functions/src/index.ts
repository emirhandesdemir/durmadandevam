// Bu dosya, Firebase projesinin sunucu tarafı mantığını içerir.
// Veritabanındaki belirli olaylara (örn: yeni bildirim oluşturma) tepki vererek
// anlık bildirim gönderme gibi işlemleri gerçekleştirir.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Firebase Admin SDK'sını başlat.
admin.initializeApp();
const db = admin.firestore();

/**
 * 'broadcasts' koleksiyonuna yeni bir belge eklendiğinde tetiklenir.
 * Tüm kullanıcılara anlık bildirim gönderir.
 */
export const onBroadcastCreate = functions.region("us-central1").firestore
    .document("broadcasts/{broadcastId}")
    .onCreate(async (snapshot) => {
        const broadcastData = snapshot.data();
        if (!broadcastData) return;

        const { title, body, link } = broadcastData;
        const usersSnapshot = await db.collection('users').get();
        const tokens: string[] = [];

        usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                tokens.push(...userData.fcmTokens);
            }
        });
        
        if (tokens.length === 0) {
            console.log("No FCM tokens found to send broadcast.");
            return;
        }

        const message: admin.messaging.MulticastMessage = {
            tokens: [...new Set(tokens)], // Remove duplicate tokens
            notification: {
                title: title,
                body: body,
            },
            webpush: {
                fcmOptions: {
                    link: `https://hiwewalkbeta.netlify.app${link || '/'}`
                },
                notification: {
                    icon: "/icons/icon.svg",
                }
            }
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`${response.successCount} broadcast messages were sent successfully`);
        } catch (error) {
            console.error("Error sending broadcast message:", error);
        }
    });

/**
 * Yeni bir bildirim dokümanı oluşturulduğunda tetiklenir.
 * FCM kullanarak hedeflenen kullanıcıya anlık bildirim gönderir.
 */
export const sendPushNotification = functions.region("us-central1").firestore
    .document("users/{userId}/notifications/{notificationId}")
    .onCreate(async (snapshot, context) => {
        const userId = context.params.userId;
        const notificationData = snapshot.data();
        if (!notificationData) return;

        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
            console.log(`User ${userId} has no FCM tokens.`);
            return;
        }

        const tokens: string[] = userData.fcmTokens;

        let title = "Yeni bir bildiriminiz var!";
        let body = "Uygulamayı açarak kontrol edin.";
        let link = "/notifications";

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
             case "complete_profile":
                title = "Profilini Tamamla! ✨";
                body = "Profiline bir biyografi ekleyerek insanların seni daha iyi tanımasını sağla.";
                link = "/profile";
                break;
        }

        const message: admin.messaging.MulticastMessage = {
            tokens: tokens,
            notification: {
                title: title,
                body: body,
            },
            webpush: {
                fcmOptions: {
                    link: `https://hiwewalkbeta.netlify.app${link}`
                },
                 notification: {
                    icon: notificationData.photoURL || "/icons/icon.svg",
                }
            }
        };

        try {
            await admin.messaging().sendEachForMulticast(message);
        } catch (error) {
            console.error("Bildirim gönderilirken hata:", error);
        }
    });

/**
 * Kullanıcı oluşturulduğunda denetim kaydı oluşturur.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const log = {
        type: "user_created",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor: { uid: user.uid, email: user.email, displayName: user.displayName },
        details: `${user.displayName || user.email || user.uid} sisteme kayıt oldu.`
    };
    await db.collection("auditLogs").add(log);
});

/**
 * Kullanıcı silindiğinde denetim kaydı oluşturur.
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
    const log = {
        type: "user_deleted",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actor: { uid: user.uid, email: user.email, displayName: user.displayName },
        details: `${user.displayName || user.email || user.uid} hesabı sistemden silindi.`
    };
     await db.collection("auditLogs").add(log);
});
