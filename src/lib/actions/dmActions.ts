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
    const messagesColRef = collection(db, 'directMessages', chatId, 'messages');
    const q = query(messagesColRef, where('receiverId', '==', currentUserId), where('read', '==', false));
    
    const unreadMessagesSnap = await getDocs(q);
    if (unreadMessagesSnap.empty) return;

    const batch = writeBatch(db);
    unreadMessagesSnap.forEach(doc => {
        batch.update(doc.ref, { read: true });
    });

    const metadataDocRef = doc(db, 'directMessagesMetadata', chatId);
    batch.update(metadataDocRef, {
        [`unreadCounts.${currentUserId}`]: 0,
    });
    
    await batch.commit();
    revalidatePath(`/dm/${chatId}`);
    revalidatePath('/dm');
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
    
    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);

        if (!messageDoc.exists()) throw new Error("Mesaj bulunamadı.");
        
        const messageData = messageDoc.data();
        if (messageData.senderId !== senderId) throw new Error("Bu mesajı düzenleme yetkiniz yok.");

        const fiveMinutesInMs = 5 * 60 * 1000;
        const messageTime = (messageData.createdAt as Timestamp).toMillis();

        if (Date.now() - messageTime > fiveMinutesInMs) {
            throw new Error("Mesaj sadece gönderildikten sonraki 5 dakika içinde düzenlenebilir.");
        }

        transaction.update(messageRef, {
            text: newText,
            edited: true,
            editedAt: serverTimestamp(),
        });
    });

    revalidatePath(`/dm/${chatId}`);
}
