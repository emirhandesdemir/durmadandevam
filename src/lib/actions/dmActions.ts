// src/lib/actions/dmActions.ts
'use server';

import { db, storage } from '@/lib/firebase';
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  increment,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  runTransaction,
  getDoc,
  deleteDoc,
  orderBy,
  addDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { getChatId } from '../utils';

interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
  selectedAvatarFrame?: string;
}

export async function addCallSystemMessageToDm(chatId: string, status: 'ended' | 'declined' | 'missed', duration?: string) {
    const messagesColRef = collection(db, 'directMessages', chatId, 'messages');
    const metadataDocRef = doc(db, 'directMessagesMetadata', chatId);
    let lastMessageText = "📞 Arama";
    
    switch(status) {
        case 'ended': lastMessageText = `📞 Arama bitti ${duration ? `· ${duration}` : ''}`; break;
        case 'declined': lastMessageText = '📞 Arama reddedildi'; break;
        case 'missed': lastMessageText = '📞 Cevapsız arama'; break;
    }

    const callDataObject: { status: string; duration?: string } = { status };
    if (duration) {
      callDataObject.duration = duration;
    }
    
    await addDoc(messagesColRef, {
        type: 'call',
        createdAt: serverTimestamp(),
        callData: callDataObject,
    });
    
    await updateDoc(metadataDocRef, {
        'lastMessage.text': lastMessageText,
        'lastMessage.timestamp': serverTimestamp(),
    });
    revalidatePath(`/dm/${chatId}`);
}


export async function sendMessage(
  chatId: string,
  sender: UserInfo,
  receiver: UserInfo,
  content: { 
    text?: string; 
    imageUrl?: string; 
    imageType?: 'permanent' | 'timed';
    audio?: { dataUrl: string; duration: number };
  }
) {
  const { text, imageUrl, imageType, audio } = content;
  if (!text?.trim() && !imageUrl && !audio) {
    throw new Error('Mesaj içeriği boş olamaz.');
  }

  const metadataDocRef = doc(db, 'directMessagesMetadata', chatId);
  const senderUserRef = doc(db, 'users', sender.uid);
  
  let finalImageUrl: string | undefined;
  if (imageUrl) {
      const folder = imageType === 'timed' ? 'timed_images' : 'images';
      const imagePath = `dms/${chatId}/${folder}/${uuidv4()}.jpg`;
      const imageStorageRef = storageRef(storage, imagePath);
      await uploadString(imageStorageRef, imageUrl, 'data_url');
      finalImageUrl = await getDownloadURL(imageStorageRef);
  }

  let finalAudioUrl: string | undefined;
  if (audio) {
      const audioPath = `dms/${chatId}/audio/${uuidv4()}.webm`;
      const audioStorageRef = storageRef(storage, audioPath);
      await uploadString(audioStorageRef, audio.dataUrl, 'data_url');
      finalAudioUrl = await getDownloadURL(audioStorageRef);
  }

  await runTransaction(db, async (transaction) => {
    const metadataDoc = await transaction.get(metadataDocRef);
    const messagesColRef = collection(db, 'directMessages', chatId, 'messages');
    const newMessageRef = doc(messagesColRef);

    const messageData: { [key: string]: any } = {
      senderId: sender.uid,
      receiverId: receiver.uid,
      createdAt: serverTimestamp(),
      read: false,
      edited: false,
      type: 'user',
      text: text || '',
    };
    if (finalImageUrl) {
        messageData.imageUrl = finalImageUrl;
        messageData.imageType = imageType;
        if (imageType === 'timed') {
            messageData.imageOpened = false;
        }
    }
    if (finalAudioUrl && audio) {
        messageData.audioUrl = finalAudioUrl;
        messageData.audioDuration = audio.duration;
    }
    
    let lastMessageText: string;
    if (finalAudioUrl) lastMessageText = '🎤 Sesli Mesaj';
    else if (finalImageUrl) lastMessageText = '📷 Fotoğraf';
    else lastMessageText = text ? (text.length > 30 ? text.substring(0, 27) + '...' : text) : 'Mesaj';

    transaction.set(newMessageRef, messageData);
    
    // Update sender's last action timestamp for rate limiting
    transaction.update(senderUserRef, { lastActionTimestamp: serverTimestamp() });
    
    if (!metadataDoc.exists()) {
      transaction.set(metadataDocRef, {
        participantUids: [sender.uid, receiver.uid],
        participantInfo: {
          [sender.uid]: { username: sender.username, photoURL: sender.photoURL || null, selectedAvatarFrame: sender.selectedAvatarFrame || '' },
          [receiver.uid]: { username: receiver.username, photoURL: receiver.photoURL || null, selectedAvatarFrame: receiver.selectedAvatarFrame || '' },
        },
        lastMessage: { text: lastMessageText, senderId: sender.uid, timestamp: serverTimestamp(), read: false },
        unreadCounts: { [receiver.uid]: 1, [sender.uid]: 0 },
      });
    } else {
      transaction.update(metadataDocRef, {
        lastMessage: { text: lastMessageText, senderId: sender.uid, timestamp: serverTimestamp(), read: false },
        [`unreadCounts.${receiver.uid}`]: increment(1),
        [`participantInfo.${sender.uid}`]: { username: sender.username, photoURL: sender.photoURL || null, selectedAvatarFrame: sender.selectedAvatarFrame || '' },
        [`participantInfo.${receiver.uid}`]: { username: receiver.username, photoURL: receiver.photoURL || null, selectedAvatarFrame: receiver.selectedAvatarFrame || '' },
      });
    }
  });

  revalidatePath(`/dm/${chatId}`);
  revalidatePath('/dm');
}


export async function markImageAsOpened(chatId: string, messageId: string, viewerId: string) {
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) throw new Error("Mesaj bulunamadı.");
    
    const messageData = messageDoc.data();
    if (messageData.receiverId !== viewerId) throw new Error("Bu fotoğrafı görüntüleme yetkiniz yok.");
    
    if (messageData.imageType !== 'timed' || messageData.imageOpened) return { success: true };

    await updateDoc(messageRef, { imageOpened: true });
    
    revalidatePath(`/dm/${chatId}`);
    return { success: true };
}


export async function deleteMessageImage(chatId: string, messageId: string, imageUrl: string) {
  const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);

  // Delete from storage
  try {
    const imageStorageRef = storageRef(storage, imageUrl);
    await deleteObject(imageStorageRef);
  } catch (error: any) {
    // It's okay if the file is already deleted.
    if (error.code !== 'storage/object-not-found') {
      console.error("Depolamadan resim silinirken hata:", error);
    }
  }

  // Update Firestore document
  await updateDoc(messageRef, {
    imageUrl: null,
    text: "Süreli fotoğrafın süresi doldu.",
    imageType: 'timed', // Keep type to identify it was a timed photo
  });

  revalidatePath(`/dm/${chatId}`);
  return { success: true };
}


/**
 * Bir sohbetteki okunmamış mesajları okundu olarak işaretler.
 * @param chatId Sohbetin ID'si.
 * @param currentUserId İşlemi yapan (mesajları okuyan) kullanıcının ID'si.
 */
export async function markMessagesAsRead(chatId: string, currentUserId: string) {
    const metadataDocRef = doc(db, 'directMessagesMetadata', chatId);
    const metadataDoc = await getDoc(metadataDocRef);

    if (metadataDoc.exists() && (metadataDoc.data().unreadCounts?.[currentUserId] || 0) > 0) {
        await updateDoc(metadataDocRef, {
            [`unreadCounts.${currentUserId}`]: 0,
            'lastMessage.read': true, // Mark last message as read by this user
        });
        revalidatePath(`/dm/${chatId}`);
        revalidatePath('/dm');
    }
}

/**
 * Kullanıcının kendi gönderdiği bir mesajı düzenler.
 */
export async function editMessage(chatId: string, messageId: string, newText: string, senderId: string) {
    if (!newText.trim()) throw new Error("Mesaj boş olamaz.");

    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    
    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) throw new Error("Mesaj bulunamadı.");
        const messageData = messageDoc.data();
        if (messageData.senderId !== senderId) throw new Error("Bu mesajı düzenleme yetkiniz yok.");

        transaction.update(messageRef, {
            text: newText,
            edited: true,
            editedAt: serverTimestamp(),
        });
    });

    revalidatePath(`/dm/${chatId}`);
}


/**
 * Kullanıcının kendi gönderdiği bir mesajı siler.
 */
export async function deleteMessage(chatId: string, messageId: string, senderId: string) {
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    
    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) throw new Error("Mesaj bulunamadı.");
        const messageData = messageDoc.data();
        if (messageData.senderId !== senderId) throw new Error("Bu mesajı silme yetkiniz yok.");

        transaction.update(messageRef, {
            text: "Bu mesaj silindi.",
            imageUrl: null,
            imageType: null,
            audioUrl: null,
            audioDuration: null,
            deleted: true,
            edited: false,
            reactions: {}
        });
    });

    revalidatePath(`/dm/${chatId}`);
    return { success: true };
}


/**
 * Bir mesaja emoji tepkisi ekler veya kaldırır.
 */
export async function toggleReaction(chatId: string, messageId: string, emoji: string, userId: string) {
  if (!chatId || !messageId || !emoji || !userId) {
    throw new Error("Gerekli bilgiler eksik.");
  }
  const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);
  try {
    await runTransaction(db, async (transaction) => {
      const messageDoc = await transaction.get(messageRef);
      if (!messageDoc.exists()) throw new Error("Mesaj bulunamadı.");

      const messageData = messageDoc.data();
      const reactions = messageData.reactions || {};
      const emojiReactors: string[] = reactions[emoji] || [];
      const userIndex = emojiReactors.indexOf(userId);

      if (userIndex > -1) {
        emojiReactors.splice(userIndex, 1);
      } else {
        emojiReactors.push(userId);
      }

      if (emojiReactors.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = emojiReactors;
      }
      
      transaction.update(messageRef, { reactions });
    });
    
    revalidatePath(`/dm/${chatId}`);
    return { success: true };

  } catch (error: any) {
    console.error("Reaksiyon değiştirilirken hata oluştu:", error);
    return { success: false, error: "Reaksiyon güncellenemedi." };
  }
}

export async function togglePinChat(chatId: string, userId: string) {
  if (!chatId || !userId) throw new Error("Sohbet ID ve Kullanıcı ID gerekli.");

  const metadataRef = doc(db, 'directMessagesMetadata', chatId);
  try {
    const docSnap = await getDoc(metadataRef);
    if (!docSnap.exists()) throw new Error("Sohbet bulunamadı.");
    
    const pinnedBy: string[] = docSnap.data().pinnedBy || [];
    const isPinned = pinnedBy.includes(userId);

    await updateDoc(metadataRef, {
      pinnedBy: isPinned ? arrayRemove(userId) : arrayUnion(userId)
    });
    
    revalidatePath('/dm');
    return { success: true, newState: !isPinned };
  } catch (error: any) {
    console.error("Sohbet sabitlenirken hata oluştu:", error);
    return { success: false, error: error.message };
  }
}

export async function hideChat(chatId: string, userId: string) {
  if (!chatId || !userId) throw new Error("Sohbet ID ve Kullanıcı ID gerekli.");

  const metadataRef = doc(db, 'directMessagesMetadata', chatId);
  try {
    // We add the user to a "hiddenBy" list instead of deleting
    await updateDoc(metadataRef, {
      hiddenBy: arrayUnion(userId)
    });
    
    revalidatePath('/dm');
    return { success: true };
  } catch (error: any) {
    console.error("Sohbet gizlenirken hata oluştu:", error);
    return { success: false, error: error.message };
  }
}
