/**
 * @fileOverview Firestore ile ilgili genel yardımcı fonksiyonları içerir.
 * Özellikle toplu silme işlemleri için kullanılır.
 */
'use server';

import { doc, deleteDoc, collection, getDocs, writeBatch, limit, query } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, listAll, deleteObject } from 'firebase/storage';

/**
 * Belirtilen bir klasördeki tüm dosyaları (alt klasörler dahil) Firebase Storage'dan siler.
 * @param folderPath Silinecek klasörün yolu (örn: 'upload/rooms/roomId123').
 */
async function deleteStorageFolder(folderPath: string) {
    const folderRef = ref(storage, folderPath);
    try {
        const res = await listAll(folderRef);
        
        // Mevcut klasördeki tüm dosyaları sil.
        const deleteFilePromises = res.items.map((itemRef) => deleteObject(itemRef));
        await Promise.all(deleteFilePromises);

        // Tüm alt klasörleri özyineli (recursive) olarak sil.
        const deleteFolderPromises = res.prefixes.map((subfolderRef) => deleteStorageFolder(subfolderRef.fullPath));
        await Promise.all(deleteFolderPromises);

    } catch (error: any) {
        // Eğer klasör zaten yoksa hata verme, bu beklenen bir durum olabilir.
        if (error.code === 'storage/object-not-found') {
            return;
        }
        console.error(`Klasör silinirken hata oluştu: ${folderPath}:`, error);
        // Firestore silme işleminin devam etmesi için hatayı yeniden fırlatmıyoruz.
    }
}


/**
 * Bir koleksiyonu toplu (batch) olarak silerek bellek aşımlarını ve
 * performans sorunlarını önler. Firestore'un tek seferde silebileceği
 * doküman sayısı limitlidir, bu fonksiyon bu limiti aşar.
 * @param collectionRef Silinecek koleksiyonun referansı.
 * @param batchSize Her bir toplu işlemde silinecek doküman sayısı.
 */
async function deleteCollection(collectionRef: any, batchSize: number) {
    const q = query(collectionRef, limit(batchSize));
    const snapshot = await getDocs(q);

    // Koleksiyon boşsa işlemi bitir.
    if (snapshot.size === 0) {
        return;
    }

    // Toplu yazma işlemi başlat.
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Eğer silinecek daha fazla doküman varsa, fonksiyonu tekrar çağır.
    if (snapshot.size >= batchSize) {
        await deleteCollection(collectionRef, batchSize);
    }
}

/**
 * Bir oda dokümanını, tüm alt koleksiyonlarını (mesajlar, katılımcılar vb.)
 * ve o odayla ilişkili tüm dosyaları Firebase Storage'dan tamamen siler.
 * @param roomId Silinecek odanın ID'si.
 */
export async function deleteRoomWithSubcollections(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);

    // Firestore alt koleksiyonlarını sil.
    const subcollections = ['messages', 'voiceParticipants', 'signals', 'games', 'game_sessions', 'playlist'];
    for (const sub of subcollections) {
        await deleteCollection(collection(roomRef, sub), 50);
    }

    // Storage'daki ilgili dosyaları sil.
    await deleteStorageFolder(`upload/rooms/${roomId}`);
    await deleteStorageFolder(`music/${roomId}`);


    // Ana oda dokümanını sil.
    await deleteDoc(roomRef);
}

/**
 * Bir sohbet dokümanını, tüm alt koleksiyonlarını (mesajlar)
 * ve o sohbetle ilişkili tüm dosyaları Firebase Storage'dan tamamen siler.
 * @param chatId Silinecek sohbetin ID'si.
 */
export async function deleteChatWithSubcollections(chatId: string) {
    const metadataRef = doc(db, 'directMessagesMetadata', chatId);
    const messagesCollectionRef = collection(db, 'directMessages', chatId, 'messages');

    // Firestore subcollections
    await deleteCollection(messagesCollectionRef, 50);

    // Storage folder (e.g., for images, audio)
    await deleteStorageFolder(`dms/${chatId}`);

    // Main metadata document
    await deleteDoc(metadataRef);
}
