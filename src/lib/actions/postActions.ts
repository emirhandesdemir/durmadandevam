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
    runTransaction,
    collection,
    serverTimestamp
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { revalidatePath } from "next/cache";

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

// Refactored to be more robust and use a transaction
export async function likePost(
    postId: string,
    currentUser: { uid: string, displayName: string | null, photoURL: string | null }
) {
    const postRef = doc(db, "posts", postId);
    
    await runTransaction(db, async (transaction) => {
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) {
            throw new Error("Gönderi bulunamadı.");
        }
        const postData = postSnap.data();
        const isCurrentlyLiked = (postData.likes || []).includes(currentUser.uid);

        if (isCurrentlyLiked) {
            transaction.update(postRef, {
                likes: arrayRemove(currentUser.uid),
                likeCount: increment(-1)
            });
        } else {
            transaction.update(postRef, {
                likes: arrayUnion(currentUser.uid),
                likeCount: increment(1)
            });
            
            // Send notification only when liking, not unliking, and not to self
            if (postData.uid !== currentUser.uid) {
                const notificationsRef = collection(db, 'notifications');
                const newNotifRef = doc(notificationsRef);
                transaction.set(newNotifRef, {
                    recipientId: postData.uid,
                    senderId: currentUser.uid,
                    senderUsername: currentUser.displayName || "Biri",
                    senderAvatar: currentUser.photoURL,
                    type: 'like',
                    postId: postId,
                    postImage: postData.imageUrl || null,
                    createdAt: serverTimestamp(),
                    read: false,
                });
                
                const recipientUserRef = doc(db, 'users', postData.uid);
                transaction.update(recipientUserRef, {
                    hasUnreadNotifications: true
                });
            }
        }
    });

    revalidatePath(`/profile/${postData.uid}`);
    revalidatePath(`/home`);
}
