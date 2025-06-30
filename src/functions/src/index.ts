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

        // Construct the notification message
        let title = "Yeni bir bildiriminiz var!";
        let body = "Uygulamayı açarak kontrol edin.";

        switch (notificationData.type) {
            case "like":
                title = "Yeni Beğeni 👍";
                body = `${notificationData.senderUsername} gönderinizi beğendi.`;
                break;
            case "comment":
                title = "Yeni Yorum 💬";
                body = `${notificationData.senderUsername} gönderinize yorum yaptı: "${notificationData.commentText}"`;
                break;
            case "follow":
                title = "Yeni Takipçi 🎉";
                body = `${notificationData.senderUsername} sizi takip etmeye başladı.`;
                break;
            case "follow_accept":
                    title = "Takip İsteği Kabul Edildi ✅";
                    body = `${notificationData.senderUsername} takip isteğinizi kabul etti.`;
                    break;
            case "mention":
                title = "Biri Sizden Bahsetti! 📣";
                body = `${notificationData.senderUsername} bir gönderide sizden bahsetti.`;
                break;
            case "room_invite":
                title = "Oda Daveti 🚪";
                body = `${notificationData.senderUsername} sizi "${notificationData.roomName}" odasına davet etti.`;
                break;
        }

        const payload = {
            notification: {
                title: title,
                body: body,
                icon: "/icons/icon-192x192.png",
            },
            webpush: {
                fcmOptions: {
                    // This link will be opened when the notification is clicked.
                    link: notificationData.postId
                        ? `/post/${notificationData.postId}`
                        : `/profile/${notificationData.senderId}`,
                },
            },
        };

        // Send notifications to all tokens.
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
                // Cleanup the tokens who are not registered anymore.
                if (
                    error.code === "messaging/invalid-registration-token" ||
                    error.code === "messaging/registration-token-not-registered"
                ) {
                    tokensToRemove.push(tokens[index]);
                }
            }
        });

        // If there are any invalid tokens, remove them from the user's document.
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
