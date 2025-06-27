'use server';

import { db } from '@/lib/firebase';
import { deleteRoomWithSubcollections } from '@/lib/firestoreUtils';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Sends a system message to a room's chat.
 */
export async function addSystemMessage(roomId: string, text: string) {
    if (!roomId || !text) throw new Error("Oda ID'si ve mesaj metni gereklidir.");

    try {
        const messagesRef = collection(db, 'rooms', roomId, 'messages');
        await addDoc(messagesRef, {
            type: 'system',
            text,
            createdAt: serverTimestamp(),
            uid: 'system',
            username: 'System',
        });
        return { success: true };
    } catch (error: any) {
        console.error("Sistem mesajı gönderilirken hata:", error);
        return { success: false, error: error.message };
    }
}


/**
 * Deletes a room if the provided user is the owner.
 */
export async function deleteRoomAsOwner(roomId: string, userId: string) {
    if (!roomId || !userId) throw new Error("Oda ID'si ve kullanıcı ID'si gereklidir.");

    const roomRef = doc(db, 'rooms', roomId);
    
    try {
        const roomDoc = await getDoc(roomRef);
        if (!roomDoc.exists()) {
            // The room is already gone, which is fine.
            return { success: true, message: "Oda zaten silinmiş." };
        }

        if (roomDoc.data().createdBy.uid !== userId) {
            throw new Error("Bu odayı silme yetkiniz yok.");
        }

        await deleteRoomWithSubcollections(roomId);

        return { success: true };

    } catch (error: any) {
        console.error("Oda silinirken hata:", error);
        return { success: false, error: error.message };
    }
}
