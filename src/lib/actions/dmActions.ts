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
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
  selectedAvatarFrame?: string;
}

export async function sendMessage(
  chatId: string,
  sender: UserInfo,
  receiver: UserInfo,
  content: { text?: string; imageUrl?: string; audio?: { dataUrl: string; duration: number } }
) {
  const { text, imageUrl, audio } = content;
  if (!text?.trim() && !imageUrl && !audio) {
    throw new Error('Mesaj içeriği boş olamaz.');
  }

  const metadataDocRef = doc(db, 'directMessagesMetadata', chatId);
  
  let finalAudioUrl: string | undefined;
  if (audio) {
      const audioPath = `dms/${chatId}/audio/${uuidv4()}.webm`;
      const audioStorageRef = ref(storage, audioPath);
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
      text: text || '',
    };
    if (imageUrl) messageData.imageUrl = imageUrl;
    if (finalAudioUrl && audio) {
        messageData.audioUrl = finalAudioUrl;
        messageData.audioDuration = audio.duration;
    }
    
    let lastMessageText: string;
    if (finalAudioUrl) lastMessageText = '🎤 Sesli Mesaj';
    else if (imageUrl) lastMessageText = '📷 Resim';
    else lastMessageText = text ? (text.length > 30 ? text.substring(0, 27) + '...' : text) : 'Mesaj';

    transaction.set(newMessageRef, messageData);
    
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
 * @param chatId Sohbetin ID'si.
 * @param messageId Düzenlenecek mesajın ID'si.
 * @param newText Mesajın yeni metni.
 * @param senderId Mesajı gönderen kullanıcının ID'si.
 */
export async function editMessage(chatId: string, messageId: string, newText: string, senderId: string) {
    if (!newText.trim()) throw new Error("Mesaj boş olamaz.");

    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    const metadataRef = doc(db, 'directMessagesMetadata', chatId);
    
    await runTransaction(db, async (transaction) => {
        const [messageDoc, metadataDoc] = await Promise.all([
            transaction.get(messageRef),
            transaction.get(metadataRef)
        ]);

        if (!messageDoc.exists()) throw new Error("Mesaj bulunamadı.");
        
        const messageData = messageDoc.data();
        if (messageData.senderId !== senderId) throw new Error("Bu mesajı düzenleme yetkiniz yok.");

        transaction.update(messageRef, {
            text: newText,
            edited: true,
            editedAt: serverTimestamp(),
        });
        
        if (metadataDoc.exists()) {
            const metadata = metadataDoc.data();
            const lastMessageTimestamp = metadata.lastMessage?.timestamp as Timestamp;
            
            // It's possible for createdAt to not be populated yet if a message is edited very quickly.
            // In that case, we can't reliably check if it's the last message, but it's a rare edge case.
            const currentMessageTimestamp = messageData.createdAt as Timestamp;
            if (lastMessageTimestamp && currentMessageTimestamp && lastMessageTimestamp.isEqual(currentMessageTimestamp)) {
                 const lastMessageText = newText.length > 30 ? newText.substring(0, 27) + '...' : newText;
                 transaction.update(metadataRef, { 'lastMessage.text': lastMessageText });
            }
        }
    });

    revalidatePath(`/dm/${chatId}`);
}


/**
 * Kullanıcının kendi gönderdiği bir mesajı siler.
 * @param chatId Sohbetin ID'si.
 * @param messageId Silinecek mesajın ID'si.
 * @param senderId Mesajı gönderen kullanıcının ID'si.
 */
export async function deleteMessage(chatId: string, messageId: string, senderId: string) {
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    const metadataRef = doc(db, 'directMessagesMetadata', chatId);
    
    await runTransaction(db, async (transaction) => {
        const [messageDoc, metadataDoc] = await Promise.all([
            transaction.get(messageRef),
            transaction.get(metadataRef)
        ]);

        if (!messageDoc.exists()) throw new Error("Mesaj bulunamadı.");
        
        const messageData = messageDoc.data();
        if (messageData.senderId !== senderId) throw new Error("Bu mesajı silme yetkiniz yok.");

        transaction.update(messageRef, {
            text: "Bu mesaj silindi.",
            imageUrl: null,
            audioUrl: null, // Also clear audio on delete
            audioDuration: null,
            deleted: true,
            edited: false,
            reactions: {} // Clear reactions on deletion
        });

        if (metadataDoc.exists()) {
            const metadata = metadataDoc.data();
            const lastMessageTimestamp = metadata.lastMessage?.timestamp as Timestamp;
            const currentMessageTimestamp = messageData.createdAt as Timestamp;

            if (lastMessageTimestamp && currentMessageTimestamp && lastMessageTimestamp.isEqual(currentMessageTimestamp)) {
                 transaction.update(metadataRef, { 'lastMessage.text': 'Bu mesaj silindi.' });
            }
        }
    });

    revalidatePath(`/dm/${chatId}`);
    return { success: true };
}


/**
 * Bir mesaja emoji tepkisi ekler veya kaldırır.
 * @param chatId Sohbetin ID'si
 * @param messageId Tepki verilecek mesajın ID'si
 * @param emoji Tepki emojisi
 * @param userId Tepki veren kullanıcının ID'si
 */
export async function toggleReaction(chatId: string, messageId: string, emoji: string, userId: string) {
  if (!chatId || !messageId || !emoji || !userId) {
    throw new Error("Gerekli bilgiler eksik.");
  }

  const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);

  try {
    await runTransaction(db, async (transaction) => {
      const messageDoc = await transaction.get(messageRef);
      if (!messageDoc.exists()) {
        throw new Error("Mesaj bulunamadı.");
      }

      const messageData = messageDoc.data();
      const reactions = messageData.reactions || {};
      const emojiReactors: string[] = reactions[emoji] || [];
      const userIndex = emojiReactors.indexOf(userId);

      if (userIndex > -1) {
        // Kullanıcı bu emoji ile zaten tepki vermiş, tepkiyi kaldır
        emojiReactors.splice(userIndex, 1);
      } else {
        // Kullanıcı bu emoji ile tepki vermemiş, tepkiyi ekle
        emojiReactors.push(userId);
      }

      if (emojiReactors.length === 0) {
        // Bu emoji ile artık kimse tepki vermiyorsa, emoji anahtarını sil
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
