// src/lib/actions/commentActions.ts
'use server';

import { db } from "@/lib/firebase";
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    doc,
    deleteDoc,
    updateDoc,
    writeBatch,
    increment
} from "firebase/firestore";
import type { User } from "firebase/auth";

interface AddCommentArgs {
    postId: string;
    text: string;
    user: User;
    replyTo?: {
        commentId: string;
        username: string;
    }
}

/**
 * Bir gönderiye yeni bir yorum ekler ve gönderinin yorum sayısını artırır.
 * @param {AddCommentArgs} args - Yorum bilgileri.
 */
export async function addComment({ postId, text, user, replyTo }: AddCommentArgs) {
    if (!user) throw new Error("Yetkilendirme hatası.");
    if (!text.trim()) throw new Error("Yorum metni boş olamaz.");

    const postRef = doc(db, "posts", postId);
    const commentsColRef = collection(postRef, "comments");

    const batch = writeBatch(db);
    
    // Yeni yorum dökümanı oluştur
    const newCommentRef = doc(commentsColRef); // ID'yi önceden al
    batch.set(newCommentRef, {
        uid: user.uid,
        username: user.displayName,
        userAvatar: user.photoURL,
        text: text,
        createdAt: serverTimestamp(),
        replyTo: replyTo || null,
    });

    // Gönderideki yorum sayısını artır
    batch.update(postRef, {
        commentCount: increment(1)
    });
    
    await batch.commit();
}


/**
 * Bir yorumu siler ve gönderinin yorum sayısını azaltır.
 * @param postId Yorumun ait olduğu gönderinin ID'si.
 * @param commentId Silinecek yorumun ID'si.
 */
export async function deleteComment(postId: string, commentId: string) {
    const postRef = doc(db, "posts", postId);
    const commentRef = doc(postRef, "comments", commentId);

    const batch = writeBatch(db);

    // Yorumu sil
    batch.delete(commentRef);

    // Gönderideki yorum sayısını azalt
    batch.update(postRef, {
        commentCount: increment(-1)
    });

    await batch.commit();
}
