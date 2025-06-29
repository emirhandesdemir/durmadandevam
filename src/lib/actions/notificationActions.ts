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

  } catch (error) {
    console.error("Bildirim oluşturulurken hata:", error);
  }
}
