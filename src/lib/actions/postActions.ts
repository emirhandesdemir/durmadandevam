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
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { createNotification } from "./notificationActions";
import type { Post } from "../types";


export async function deletePost(postId: string, imageUrl?: string) {
    const postRef = doc(db, "posts", postId);
    await deleteDoc(postRef);

    if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(error => {
            console.error("Storage resmi silinirken hata oluştu (göz ardı edilebilir):", error);
        });
    }
}


export async function updatePost(postId: string, newText: string) {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        text: newText
    });
}


export async function likePost(post: Post, currentUser: { uid: string, displayName: string | null, photoURL: string | null }) {
    const isCurrentlyLiked = (post.likes || []).includes(currentUser.uid);
    const postRef = doc(db, "posts", post.id);
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

    // Beğeniyi geri alırken bildirim gönderme, sadece beğenirken gönder
    if (!isCurrentlyLiked && post.uid !== currentUser.uid) {
        await createNotification({
            recipientId: post.uid,
            senderId: currentUser.uid,
            senderUsername: currentUser.displayName || "Biri",
            senderAvatar: currentUser.photoURL,
            type: 'like',
            postId: post.id,
            postImage: post.imageUrl || null,
        });
    }
}
