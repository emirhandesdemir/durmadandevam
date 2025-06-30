// src/lib/actions/dmActions.ts
'use server';

import { db } from '@/lib/firebase';
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
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
  selectedAvatarFrame?: string;
}

/**
 * Yeni bir özel mesaj gönderir ve sohbet metadatasını günceller.
 * Bu fonksiyon artık bir transaction kullanarak metadata'nın atomik olarak
 * oluşturulmasını veya güncellenmesini sağlar.
 * @param chatId Sohbetin ID'si.
 * @param sender Gönderen kullanıcı bilgisi.
 * @param receiver Alıcı kullanıcı bilgisi.
 * @param text Gönderilecek mesaj metni.
 * @param imageUrl Gönderilecek resmin URL'si (isteğe bağlı).
 */
export async function sendMessage(chatId: string, sender: UserInfo, receiver: UserInfo, text?: string, imageUrl?: string) {
  if (!text?.trim() && !imageUrl) throw new Error('Mesaj içeriği boş olamaz.');

  const metadataDocRef = doc(db, 'directMessagesMetadata', chatId);
  
  await runTransaction(db, async (transaction) => {
    // 1. Önce OKUMA işlemini yap.
    const metadataDoc = await transaction.get(metadataDocRef);

    // 2. YAZMA işlemlerini hazırla.
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
    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }
    
    const lastMessageText = imageUrl ? '📷 Resim' : (text ? (text.length > 30 ? text.substring(0, 27) + '...' : text) : 'Mesaj');

    // 3. Şimdi tüm YAZMA işlemlerini gerçekleştir.
    transaction.set(newMessageRef, messageData);
    
    if (!metadataDoc.exists()) {
      // Create new metadata document if it doesn't exist
      const newMetadata = {
        participantUids: [sender.uid, receiver.uid],
        participantInfo: {
          [sender.uid]: { username: sender.username, photoURL: sender.photoURL || null, selectedAvatarFrame: sender.selectedAvatarFrame || '' },
          [receiver.uid]: { username: receiver.username, photoURL: receiver.photoURL || null, selectedAvatarFrame: receiver.selectedAvatarFrame || '' },
        },
        lastMessage: {
          text: lastMessageText,
          senderId: sender.uid,
          timestamp: serverTimestamp(),
          read: false,
        },
        unreadCounts: {
          [receiver.uid]: 1,
          [sender.uid]: 0,
        },
      };
      transaction.set(metadataDocRef, newMetadata);
    } else {
      // Update existing metadata document
      const metadataUpdate = {
        lastMessage: {
          text: lastMessageText,
          senderId: sender.uid,
          timestamp: serverTimestamp(),
          read: false,
        },
        [`unreadCounts.${receiver.uid}`]: increment(1),
        // Ensure participant info is up-to-date
        [`participantInfo.${sender.uid}`]: { username: sender.username, photoURL: sender.photoURL || null, selectedAvatarFrame: sender.selectedAvatarFrame || '' },
        [`participantInfo.${receiver.uid}`]: { username: receiver.username, photoURL: receiver.photoURL || null, selectedAvatarFrame: receiver.selectedAvatarFrame || '' },
      };
      transaction.update(metadataDocRef, metadataUpdate);
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
