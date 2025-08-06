// src/lib/actions/notificationActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { assignMissingUniqueTag } from './userActions';

interface CreateNotificationArgs {
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string | null;
  senderAvatarFrame?: string;
  type: 'like' | 'comment' | 'follow' | 'follow_accept' | 'room_invite' | 'mention' | 'diamond_transfer' | 'retweet' | 'referral_bonus' | 'dm_message' | 'complete_profile' | 'system' | 'event_reward';
  postId?: string | null;
  postImage?: string | null;
  commentText?: string;
  messageText?: string;
  chatId?: string;
  roomId?: string;
  roomName?: string;
  diamondAmount?: number;
  profileEmoji?: string | null;
  senderUniqueTag?: number;
  link?: string;
}

interface BroadcastNotificationArgs {
    title: string;
    body: string;
    link?: string;
}

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

export async function triggerProfileCompletionNotification(userId: string) {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const userData = userSnap.data();
        if (!userData.bio && !userData.profileCompletionNotificationSent) {
            await createNotification({
                recipientId: userId,
                senderId: 'system-profile',
                senderUsername: 'HiweWalk',
                senderAvatar: 'https://placehold.co/100x100.png',
                type: 'complete_profile',
            });
            await updateDoc(userRef, { profileCompletionNotificationSent: true });
        }
    }
}

export async function createNotification(data: Omit<CreateNotificationArgs, 'id' | 'createdAt' | 'read'>) {
  // Don't send notifications for self-actions
  if (data.senderId === data.recipientId) return;
  
  const recipientUserRef = doc(db, 'users', data.recipientId);
  const notificationsColRef = collection(recipientUserRef, "notifications");

  // Determine link based on notification type
  let link = '/notifications';
  switch (data.type) {
    case 'like':
    case 'comment':
    case 'mention':
    case 'retweet':
        link = data.postId ? `/post/${data.postId}` : '/notifications'; // Future-proofing for post detail page
        break;
    case 'follow':
    case 'follow_accept':
    case 'referral_bonus':
    case 'diamond_transfer':
        link = data.senderId ? `/profile/${data.senderId}` : '/home';
        break;
    case 'room_invite':
        link = `/rooms/${data.roomId}`;
        break;
    case 'dm_message':
        link = `/dm/${data.chatId}`;
        break;
    case 'complete_profile':
        link = '/profile/edit';
        break;
    case 'event_reward':
        link = '/rooms';
        break;
  }
  
  try {
    // This document creation will trigger the `sendPushNotification` Cloud Function.
    await addDoc(notificationsColRef, {
      ...data,
      link: data.link || link,
      photoURL: data.senderAvatar || null,
      senderAvatarFrame: data.senderAvatarFrame || '',
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


export async function deleteNotification(userId: string, notificationId: string) {
    if (!userId || !notificationId) {
        throw new Error("Kullanıcı ID ve Bildirim ID'si gerekli.");
    }
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    try {
        await deleteDoc(notificationRef);
        revalidatePath('/notifications');
        return { success: true };
    } catch (error: any) {
        console.error("Bildirim silinirken hata:", error);
        return { success: false, error: "Bildirim silinemedi." };
    }
}
