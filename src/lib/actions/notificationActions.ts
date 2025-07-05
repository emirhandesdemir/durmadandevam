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
  type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'mention' | 'diamond_transfer' | 'retweet' | 'referral_bonus' | 'call_incoming' | 'call_missed' | 'dm_message';
  postId?: string | null;
  postImage?: string | null;
  commentText?: string;
  messageText?: string;
  chatId?: string;
  roomId?: string;
  roomName?: string;
  diamondAmount?: number;
  callId?: string;
  callType?: 'video' | 'audio';
}

interface BroadcastNotificationArgs {
    title: string;
    body: string;
    link?: string;
}

/**
 * Creates a document in the `broadcasts` collection, which triggers a Cloud
 * Function to send a notification to all subscribed users.
 * @param data The broadcast message data.
 */
export async function sendBroadcastNotification(data: BroadcastNotificationArgs) {
    if (!data.title || !data.body) {
        return { success: false, error: "Başlık ve mesaj içeriği zorunludur." };
    }
    try {
        const broadcastsRef = collection(db, 'broadcasts');
        await addDoc(broadcastsRef, {
            ...data,
            sentAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error creating broadcast document:", error);
        return { success: false, error: "Duyuru gönderilirken bir hata oluştu." };
    }
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

    // DO NOT set the general notification flag for DM messages.
    // The DM unread count is handled separately.
    if (data.type !== 'dm_message') {
        await updateDoc(recipientUserRef, {
          hasUnreadNotifications: true,
        });
    }

  } catch (error) {
    console.error("Error creating notification document:", error);
  }
}
