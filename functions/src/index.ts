// Bu dosya, Firebase projesinin sunucu tarafı mantığını içerir.
// Veritabanındaki belirli olaylara (örn: yeni bildirim oluşturma) tepki vererek
// anlık bildirim gönderme gibi işlemleri gerçekleştirir.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Firebase Admin SDK'sını başlat. Bu, sunucu tarafında Firebase servislerine erişim sağlar.
admin.initializeApp();

// Firestore veritabanı örneğini al.
const db = admin.firestore();

/**
 * Yeni bir bildirim dokümanı oluşturulduğunda tetiklenir.
 * Kullanıcının FCM jetonlarını alır ve bir anlık bildirim gönderir.
 */
export const sendPushNotification = functions
    .region("us-central1") // Fonksiyonun çalışacağı bölgeyi belirt.
    .firestore.document("users/{userId}/notifications/{notificationId}")
    .onCreate(async (snapshot: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
        const notificationData = snapshot.data();
        if (!notificationData) {
            console.log("Bildirim verisi bulunamadı.");
            return;
        }

        const userId = context.params.userId;
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log(`Kullanıcı dokümanı bulunamadı: ${userId}`);
            return;
        }

        const userData = userDoc.data();
        // Kullanıcının bildirim jetonu (FCM token) yoksa işlem yapma.
        if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
            console.log(`Kullanıcı ${userId} için FCM jetonu yok.`);
            return;
        }
        
        const tokens: string[] = userData.fcmTokens;

        // Bildirim türüne göre başlık, içerik ve link belirle.
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
        }

        const payload: admin.messaging.MessagingPayload = {
            data: {
                title: title,
                body: body,
                icon: "/icons/icon.svg",
                link: link,
            },
            webpush: {
                fcmOptions: {
                    link: link, 
                },
            },
        };

        // Bildirimi cihazlara gönder.
        const response = await admin.messaging().sendToDevice(tokens, payload);

        // Geçersiz veya süresi dolmuş jetonları temizle.
        const tokensToRemove: string[] = [];
        response.results.forEach((result: admin.messaging.MessagingDeviceResult, index: number) => {
            const error = result.error;
            if (error) {
                console.error(
                    "Bildirim gönderilirken hata:",
                    tokens[index],
                    error
                );
                // Eğer jeton geçersizse, silinecekler listesine ekle.
                if (
                    error.code === "messaging/invalid-registration-token" ||
                    error.code === "messaging/registration-token-not-registered"
                ) {
                    tokensToRemove.push(tokens[index]);
                }
            }
        });

        // Geçersiz jetonlar varsa kullanıcı dokümanından sil.
        if (tokensToRemove.length > 0) {
            return userRef.update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
            });
        }

        return null;
    });

/**
 * Firebase Authentication'da yeni bir kullanıcı oluşturulduğunda tetiklenir.
 * Kullanıcı oluşturma olayı için bir denetim kaydı (audit log) oluşturur.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user: admin.auth.UserRecord) => {
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
export const onUserDelete = functions.auth.user().onDelete(async (user: admin.auth.UserRecord) => {
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
