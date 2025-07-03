// Bu dosya, Firebase projesinin sunucu tarafı mantığını içerir.
// Veritabanındaki belirli olaylara (örn: yeni bildirim oluşturma) tepki vererek
// anlık bildirim gönderme gibi işlemleri gerçekleştirir.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { functionAi } from './genkit-config';
import { roomBotFlow } from './flows/roomBotFlow';

// Firebase Admin SDK'sını başlat. Bu, sunucu tarafında Firebase servislerine erişim sağlar.
admin.initializeApp();

// Firestore veritabanı örneğini al.
const db = admin.firestore();

/**
 * Yeni bir bildirim dokümanı oluşturulduğunda tetiklenir.
 * Kullanıcının FCM jetonlarını alır ve Firebase Cloud Messaging API (V1) kullanarak
 * bir anlık bildirim gönderir.
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
        if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
            console.log(`Kullanıcı ${userId} için FCM jetonu yok.`);
            return;
        }
        
        const tokens: string[] = userData.fcmTokens;

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

        // Firebase Cloud Messaging API (V1) için data-only mesaj oluştur.
        // Bu, servis çalışanına bildirim üzerinde tam kontrol sağlar.
        const message: admin.messaging.MulticastMessage = {
            tokens: tokens,
            data: {
                title: title,
                body: body,
                icon: "/icons/icon-192x192.png", // PNG ikonunu kullan
                link: link,
            }
        };

        // Bildirimi birden fazla cihaza gönder.
        const response = await admin.messaging().sendEachForMulticast(message);

        // Geçersiz veya süresi dolmuş jetonları temizle.
        const tokensToRemove: string[] = [];
        response.responses.forEach((result, index) => {
            if (!result.success) {
                const error = result.error;
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

export const onMessageCreate = functions.firestore
  .document('rooms/{roomId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { roomId, messageId } = context.params;

    if (message.text && message.text.toLowerCase().includes('@walk')) {
      // Get recent history
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
        const responseText = await roomBotFlow({
            history,
            currentMessage: message.text,
            isGreeting,
            authorUsername: message.username,
        });

        // Add bot's response to the chat
        await db.collection(`rooms/${roomId}/messages`).add({
            uid: 'ai-bot-walk',
            username: 'Walk',
            photoURL: `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="url(#bot-grad)"/><rect x="25" y="45" width="50" height="20" rx="10" fill="white" fill-opacity="0.8"/><circle cx="50" cy="40" r="15" fill="white"/><circle cx="50" cy="40" r="10" fill="url(#eye-grad)"/><path d="M35 70 Q 50 80, 65 70" stroke="white" stroke-width="4" stroke-linecap="round" fill="none"/><defs><linearGradient id="bot-grad" x1="0" y1="0" x2="100" y2="100"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#3b82f6"/></linearGradient><radialGradient id="eye-grad"><stop offset="20%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#2563eb"/></radialGradient></defs></svg>`)}`,
            selectedAvatarFrame: 'avatar-frame-tech',
            text: responseText,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'user',
        });
      } catch (error) {
        console.error("Error running roomBotFlow:", error);
      }
    }
});
