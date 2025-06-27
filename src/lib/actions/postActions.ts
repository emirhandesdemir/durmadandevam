// src/lib/actions/postActions.ts
'use server';

import { db, storage } from "@/lib/firebase";
import { 
    doc, 
    writeBatch, 
    arrayUnion, 
    arrayRemove,
    deleteDoc,
    updateDoc,
    increment,
    getDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { createNotification } from "./notificationActions";

export async function deletePost(postId: string, imageUrl?: string) {
    const postRef = doc(db, "posts", postId);
    
    // To delete subcollections, you need a recursive function,
    // which is best handled by a Cloud Function trigger for robustness.
    // For now, we only delete the post document itself.
    await deleteDoc(postRef);

    if (imageUrl) {
        try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
        } catch (error: any) {
            // It's okay if the file doesn't exist (e.g., already deleted).
            if (error.code !== 'storage/object-not-found') {
                console.error("Storage resmi silinirken hata oluştu:", error);
            }
        }
    }
}


export async function updatePost(postId: string, newText: string) {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        text: newText
    });
}

// Refactored to be more robust and less reliant on client-side data
export async function likePost(
    postId: string,
    postAuthorUid: string,
    postImageUrl: string | null,
    currentUser: { uid: string, displayName: string | null, photoURL: string | null }
) {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
        throw new Error("Gönderi bulunamadı.");
    }
    const postData = postSnap.data();

    const isCurrentlyLiked = (postData.likes || []).includes(currentUser.uid);
    
    const batch = writeBatch(db);

    if (isCurrentlyLiked) {
        batch.update(postRef, {
            likes: arrayRemove(currentUser.uid),
            likeCount: increment(-1)
        });
    } else {
        batch.update(postRef, {
            likes: arrayUnion(currentUser.uid),
            likeCount: increment(1)
        });
    }
    await batch.commit();

    // Send notification only when liking, not unliking
    if (!isCurrentlyLiked && postAuthorUid !== currentUser.uid) {
        await createNotification({
            recipientId: postAuthorUid,
            senderId: currentUser.uid,
            senderUsername: currentUser.displayName || "Biri",
            senderAvatar: currentUser.photoURL,
            type: 'like',
            postId: postId,
            postImage: postImageUrl,
        });
    }
}
