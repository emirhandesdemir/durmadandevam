/**
 * @fileOverview Utility functions for interacting with Firestore.
 */
'use server';

import { doc, deleteDoc, collection, getDocs, writeBatch, limit, query } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Deletes a collection in batches to avoid out-of-memory errors.
 * @param collectionRef The reference to the collection to delete.
 * @param batchSize The number of documents to delete in each batch.
 */
async function deleteCollection(collectionRef: any, batchSize: number) {
    const q = query(collectionRef, limit(batchSize));
    const snapshot = await getDocs(q);

    if (snapshot.size === 0) {
        return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    if (snapshot.size >= batchSize) {
        await deleteCollection(collectionRef, batchSize);
    }
}

/**
 * Deletes a room document and all of its subcollections (messages, participants, signals).
 * @param roomId The ID of the room to delete.
 */
export async function deleteRoomWithSubcollections(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);

    // Alt koleksiyonları sil
    const messagesRef = collection(roomRef, 'messages');
    await deleteCollection(messagesRef, 50);

    const voiceParticipantsRef = collection(roomRef, 'voiceParticipants');
    await deleteCollection(voiceParticipantsRef, 50);
    
    const signalsRef = collection(roomRef, 'signals');
    await deleteCollection(signalsRef, 50);

    // Ana oda dökümanını sil
    await deleteDoc(roomRef);
}
