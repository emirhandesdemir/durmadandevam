// src/lib/actions/notificationActions.ts
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
  type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite';
  postId?: string | null;
  postImage?: string | null;
  commentText?: string;
  roomId?: string;
  roomName?: string;
}

/**
 * Creates a notification document in Firestore and flags the recipient user.
 */
export async function createNotification(data: CreateNotificationArgs) {
  // Don't create a notification if the sender is the recipient
  if (data.senderId === data.recipientId) {
    return;
  }
  
  const notificationsRef = collection(db, 'notifications');
  const recipientUserRef = doc(db, 'users', data.recipientId);

  try {
    // Add the new notification document
    await addDoc(notificationsRef, {
      ...data,
      createdAt: serverTimestamp(),
      read: false,
    });

    // Mark that the user has unread notifications
    await updateDoc(recipientUserRef, {
      hasUnreadNotifications: true,
    });

  } catch (error) {
    console.error("Bildirim oluşturulurken hata:", error);
  }
}

/**
 * Marks a user's unread notifications flag as false.
 */
export async function markNotificationsAsRead(userId: string) {
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, { hasUnreadNotifications: false });
    } catch (error) {
        console.error("Bildirimler okunmuş olarak işaretlenirken hata:", error);
    }
}
