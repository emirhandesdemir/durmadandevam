// src/lib/actions/commentActions.ts
'use server';

import { db } from "@/lib/firebase";
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    doc,
    deleteDoc,
    writeBatch,
    increment,
    getDoc
} from "firebase/firestore";
import { createNotification } from "./notificationActions";

interface AddCommentArgs {
    postId: string;
    text: string;
    user: {
        uid: string;
        displayName: string | null;
        photoURL: string | null;
    };
    replyTo?: {
        commentId: string;
        username: string;
    }
}

export async function addComment({ postId, text, user, replyTo }: AddCommentArgs) {
    if (!user || !user.uid) throw new Error("Yetkilendirme hatası.");
    if (!text.trim()) throw new Error("Yorum metni boş olamaz.");

    const postRef = doc(db, "posts", postId);
    const commentsColRef = collection(postRef, "comments");

    const batch = writeBatch(db);
    
    const newCommentRef = doc(commentsColRef); 
    batch.set(newCommentRef, {
        uid: user.uid,
        username: user.displayName || "Anonim Kullanıcı",
        userAvatar: user.photoURL,
        text: text,
        createdAt: serverTimestamp(),
        replyTo: replyTo || null,
    });

    batch.update(postRef, {
        commentCount: increment(1)
    });
    
    await batch.commit();

    // Gönderi sahibine bildirim gönder
    const postSnap = await getDoc(postRef);
    const postData = postSnap.data();

    if (postData && postData.uid !== user.uid) {
        await createNotification({
            recipientId: postData.uid,
            senderId: user.uid,
            senderUsername: user.displayName || "Biri",
            senderAvatar: user.photoURL,
            type: 'comment',
            postId: postId,
            postImage: postData.imageUrl || null,
            commentText: text,
        });
    }
}


export async function deleteComment(postId: string, commentId: string) {
    const postRef = doc(db, "posts", postId);
    const commentRef = doc(postRef, "comments", commentId);

    const batch = writeBatch(db);

    batch.delete(commentRef);

    batch.update(postRef, {
        commentCount: increment(-1)
    });

    await batch.commit();
}
