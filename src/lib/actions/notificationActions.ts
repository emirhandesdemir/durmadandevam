'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';

interface CreateNotificationArgs {
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string | null;
  senderAvatarFrame?: string;
  type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'mention';
  postId?: string | null;
  postImage?: string | null;
  commentText?: string;
  roomId?: string;
  roomName?: string;
}

export async function createNotification(data: CreateNotificationArgs) {
  if (data.senderId === data.recipientId) return;
  
  const recipientUserRef = doc(db, 'users', data.recipientId);
  const notificationsColRef = collection(recipientUserRef, "notifications");

  try {
    await addDoc(notificationsColRef, {
      ...data,
      createdAt: serverTimestamp(),
      read: false,
    });

    await updateDoc(recipientUserRef, {
      hasUnreadNotifications: true,
    });
    
    // In a production app, this is where you would trigger a backend service
    // (like a Firebase Cloud Function) to send a push notification.
    // That function would read the recipient's FCM tokens from their user document
    // and use the Firebase Admin SDK to send the message.

  } catch (error) {
    console.error("Bildirim oluşturulurken hata:", error);
  }
}
