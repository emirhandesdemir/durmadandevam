// src/lib/actions/postActions.ts
'use server';

import { db } from "@/lib/firebase";
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
    serverTimestamp,
    addDoc,
    getDoc,
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { deleteImage } from './cloudinaryActions';


export async function deletePost(postId: string, imagePublicId?: string) {
    const postRef = doc(db, "posts", postId);
    
    await deleteDoc(postRef);

    if (imagePublicId) {
        await deleteImage(imagePublicId);
    }
}


export async function updatePost(postId: string, newText: string) {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        text: newText
    });
}

export async function likePost(
    postId: string,
    currentUser: { uid: string, displayName: string | null, photoURL: string | null, selectedAvatarFrame?: string }
) {
    const postRef = doc(db, "posts", postId);
    
    const postData = (await getDoc(postRef)).data();
    if (!postData) throw new Error("Gönderi bulunamadı.");
    
    await runTransaction(db, async (transaction) => {
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) {
            throw new Error("Gönderi bulunamadı.");
        }
        const currentPostData = postSnap.data();
        const isCurrentlyLiked = (currentPostData.likes || []).includes(currentUser.uid);

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
            
            if (currentPostData.uid !== currentUser.uid) {
                await createNotification({
                    recipientId: currentPostData.uid,
                    senderId: currentUser.uid,
                    senderUsername: currentUser.displayName || "Biri",
                    senderAvatar: currentUser.photoURL,
                    senderAvatarFrame: currentUser.selectedAvatarFrame,
                    type: 'like',
                    postId: postId,
                    postImage: currentPostData.imageUrl || null,
                });
            }
        }
    });

    revalidatePath(`/profile/${postData.uid}`);
    revalidatePath(`/home`);
}
