
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

/**
 * Triggers when a new notification document is created for a user.
 * Fetches the user's FCM tokens and sends a push notification.
 */
export const sendPushNotification = functions
    .region("us-central1") // Specify a region for the function
    .firestore.document("users/{userId}/notifications/{notificationId}")
    .onCreate(async (snapshot, context) => {
        const notificationData = snapshot.data();
        if (!notificationData) {
            console.log("No notification data found.");
            return;
        }

        const userId = context.params.userId;
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log(`User document not found for userId: ${userId}`);
            return;
        }

        const userData = userDoc.data();
        if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
            console.log(`User ${userId} has no FCM tokens.`);
            return;
        }
        
        const tokens: string[] = userData.fcmTokens;

        let title = "Yeni bir bildiriminiz var!";
        let body = "Uygulamayı açarak kontrol edin.";
        let link = "/notifications"; // Default link

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

        const payload = {
            notification: {
                title: title,
                body: body,
                icon: "/icons/icon-192x192.png",
                click_action: link, // For older browsers/some platforms
            },
            webpush: {
                fcmOptions: {
                    link: link, // For modern browsers
                },
            },
        };

        const response = await admin.messaging().sendToDevice(tokens, payload);

        const tokensToRemove: string[] = [];
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error(
                    "Failure sending notification to",
                    tokens[index],
                    error
                );
                if (
                    error.code === "messaging/invalid-registration-token" ||
                    error.code === "messaging/registration-token-not-registered"
                ) {
                    tokensToRemove.push(tokens[index]);
                }
            }
        });

        if (tokensToRemove.length > 0) {
            return userRef.update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
            });
        }

        return null;
    });

/**
 * Triggers when a new user is created in Firebase Authentication.
 * Creates an audit log entry for the user creation.
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
 * Triggers when a user is deleted from Firebase Authentication.
 * Creates an audit log entry for the user deletion.
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
