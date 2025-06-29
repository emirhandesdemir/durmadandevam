/**
 * @fileOverview Utility functions for interacting with Firestore.
 */
'use server';

import { doc, deleteDoc, collection, getDocs, writeBatch, limit, query } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, listAll, deleteObject } from 'firebase/storage';

/**
 * Deletes all files within a specified folder in Firebase Storage, including subfolders.
 * @param folderPath The path to the folder to delete (e.g., 'upload/rooms/roomId123').
 */
async function deleteStorageFolder(folderPath: string) {
    const folderRef = ref(storage, folderPath);
    try {
        const res = await listAll(folderRef);
        
        // Delete all files in the current folder
        const deleteFilePromises = res.items.map((itemRef) => deleteObject(itemRef));
        await Promise.all(deleteFilePromises);

        // Recursively delete all subfolders
        const deleteFolderPromises = res.prefixes.map((subfolderRef) => deleteStorageFolder(subfolderRef.fullPath));
        await Promise.all(deleteFolderPromises);

    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            // It's okay if the folder doesn't exist.
            return;
        }
        console.error(`Error deleting folder ${folderPath}:`, error);
        // We don't re-throw the error to allow the Firestore deletion to proceed.
    }
}


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
 * Deletes a room document, all of its subcollections, and all associated files in Firebase Storage.
 * @param roomId The ID of the room to delete.
 */
export async function deleteRoomWithSubcollections(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);

    // Delete Firestore subcollections
    const subcollections = ['messages', 'voiceParticipants', 'signals', 'games'];
    for (const sub of subcollections) {
        await deleteCollection(collection(roomRef, sub), 50);
    }

    // Delete associated files from Storage
    const roomStoragePath = `upload/rooms/${roomId}`;
    await deleteStorageFolder(roomStoragePath);

    // Delete the main room document
    await deleteDoc(roomRef);
}
