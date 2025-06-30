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
import type { UserProfile } from '../types';

interface CreateNotificationArgs {
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string | null;
  senderAvatarFrame?: string;
  type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'mention' | 'diamond_transfer';
  postId?: string | null;
  postImage?: string | null;
  commentText?: string;
  roomId?: string;
  roomName?: string;
  diamondAmount?: number;
}

export async function createNotification(data: CreateNotificationArgs) {
  // Don't send notifications for self-actions
  if (data.senderId === data.recipientId) return;
  
  const recipientUserRef = doc(db, 'users', data.recipientId);
  const notificationsColRef = collection(recipientUserRef, "notifications");

  try {
    // This document creation will trigger the `sendPushNotification` Cloud Function.
    await addDoc(notificationsColRef, {
      ...data,
      createdAt: serverTimestamp(),
      read: false,
    });

    // Also update the hasUnreadNotifications flag for immediate UI feedback.
    await updateDoc(recipientUserRef, {
      hasUnreadNotifications: true,
    });

  } catch (error) {
    console.error("Error creating notification document:", error);
  }
}
