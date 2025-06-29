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
    getDoc,
} from "firebase/firestore";
import { createNotification } from "./notificationActions";
import { findUserByUsername } from "./userActions";

interface AddCommentArgs {
    postId: string;
    text: string;
    user: {
        uid: string;
        displayName: string | null;
        photoURL: string | null;
        userAvatarFrame?: string;
    };
    replyTo?: {
        commentId: string;
        username: string;
    }
}

async function handleMentions(text: string, postId: string, sender: { uid: string, displayName: string | null, photoURL: string | null, selectedAvatarFrame?: string }) {
    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex);

    if (mentions) {
        const usernames = new Set(mentions.map(m => m.substring(1)));
        for (const username of usernames) {
            const mentionedUser = await findUserByUsername(username);
            if (mentionedUser && mentionedUser.uid !== sender.uid) {
                await createNotification({
                    recipientId: mentionedUser.uid,
                    senderId: sender.uid,
                    senderUsername: sender.displayName || "Biri",
                    senderAvatar: sender.photoURL,
                    senderAvatarFrame: sender.selectedAvatarFrame,
                    type: 'mention',
                    postId: postId,
                    commentText: text,
                });
            }
        }
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
        userAvatarFrame: user.userAvatarFrame || '',
        text: text,
        createdAt: serverTimestamp(),
        replyTo: replyTo || null,
    });

    batch.update(postRef, {
        commentCount: increment(1)
    });
    
    const postSnap = await getDoc(postRef);
    const postData = postSnap.data();

    if (postData && postData.uid !== user.uid) {
        await createNotification({
            recipientId: postData.uid,
            senderId: user.uid,
            senderUsername: user.displayName || "Biri",
            senderAvatar: user.photoURL,
            senderAvatarFrame: user.userAvatarFrame,
            type: 'comment',
            postId: postId,
            postImage: postData.imageUrl || null,
            commentText: text,
        });
    }
    
    // Yorumdaki bahsetmeleri işle
    await handleMentions(text, postId, user);

    await batch.commit();
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
