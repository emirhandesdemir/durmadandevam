// Bu dosya, Firebase projesinin sunucu tarafı mantığını içerir.
// Veritabanındaki belirli olaylara (örn: yeni bildirim oluşturma) tepki vererek
// anlık bildirim gönderme gibi işlemleri gerçekleştirir.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as http from "http";
import { Server } from "socket.io";
import * as cors from "cors";

// Firebase Admin SDK'sını başlat.
admin.initializeApp();
const db = admin.firestore();

// Socket.IO için CORS ayarları
const corsHandler = cors({ origin: true });

// HTTP sunucusu ve Socket.IO örneği oluşturma
const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*", // Geliştirme için geniş, canlı ortamda kısıtlanmalı
        methods: ["GET", "POST"]
    }
});

const socketRooms: Record<string, Set<string>> = {}; // roomId -> Set<socketId>
const socketUserMap: Record<string, string> = {}; // socketId -> userId

// Socket.IO bağlantı mantığı
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  socket.on('join-room', (roomId, userId) => {
    const existingUsers = Array.from(socketRooms[roomId] || []).map(sid => socketUserMap[sid]).filter(Boolean);
    socket.emit('existing-users', existingUsers);
    
    socket.join(roomId);
    
    if (!socketRooms[roomId]) {
      socketRooms[roomId] = new Set();
    }
    socketRooms[roomId].add(socket.id);
    socketUserMap[socket.id] = userId; 

    // Let others know a new user has joined
    socket.to(roomId).emit('user-connected', userId);
    
    console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);
  });

  socket.on('signal', (data) => {
    // Find the target socket ID from the user ID
    const targetSocketId = Object.keys(socketUserMap).find(sid => socketUserMap[sid] === data.to);
    
    if (targetSocketId) {
      // Forward the signal to the target user, including who it's from
      io.to(targetSocketId).emit('signal', {
        from: socketUserMap[socket.id], // The user who sent the signal
        signal: data.signal,
        type: data.type
      });
    }
  });


  socket.on('speaking-status', (data) => {
    const { uid, isSpeaking } = data;
     // Find the room this socket is in and broadcast
     for (const roomId in socketRooms) {
        if (socketRooms[roomId].has(socket.id)) {
            socket.to(roomId).broadcast.emit('speaking-status-update', { uid, isSpeaking });
            break;
        }
    }
  });


  socket.on('leave-room', (roomId, userId) => {
    socket.leave(roomId);
    if (socketRooms[roomId]) {
        socketRooms[roomId].delete(socket.id);
        delete socketUserMap[socket.id];
    }
    socket.to(roomId).emit('user-disconnected', userId);
    console.log(`User ${userId} (${socket.id}) left room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("A client disconnected:", socket.id);
    const userId = socketUserMap[socket.id];
    if (userId) {
        for (const roomId in socketRooms) {
            if (socketRooms[roomId].has(socket.id)) {
                socketRooms[roomId].delete(socket.id);
                socket.to(roomId).emit('user-disconnected', userId);
                break;
            }
        }
        delete socketUserMap[socket.id];
    }
  });
});

export const socket = functions.https.onRequest((req, res) => {
  corsHandler(req, res, () => {
    server.emit("request", req, res);
  });
});

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
            tokens: [...new Set(tokens)],
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
