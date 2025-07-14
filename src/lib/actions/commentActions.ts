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
        profileEmoji: string | null;
        userAvatarFrame?: string;
        role?: 'admin' | 'user';
    };
    replyTo?: {
        commentId: string;
        username: string;
    } | null;
}

async function handleMentions(text: string, postId: string, sender: { uid: string, displayName: string | null, photoURL: string | null, profileEmoji: string | null, userAvatarFrame?: string }) {
    const mentionRegex = /(?<!\S)@\w+/g;
    const mentions = text.match(mentionRegex);

    if (mentions) {
        const usernames = new Set(mentions);
        for (const username of usernames) {
            const mentionedUser = await findUserByUsername(username.substring(1)); // Remove @
            if (mentionedUser && mentionedUser.uid !== sender.uid) {
                const postSnap = await getDoc(doc(db, "posts", postId));
                const postData = postSnap.data();
                await createNotification({
                    recipientId: mentionedUser.uid,
                    senderId: sender.uid,
                    senderUsername: sender.displayName || "Biri",
                    photoURL: sender.photoURL,
                    profileEmoji: sender.profileEmoji,
                    senderAvatarFrame: sender.userAvatarFrame,
                    type: 'mention',
                    postId: postId,
                    postImage: postData?.imageUrl || null,
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
    const userRef = doc(db, "users", user.uid);
    const commentsColRef = collection(postRef, "comments");

    const batch = writeBatch(db);
    
    const newCommentRef = doc(commentsColRef); 
    batch.set(newCommentRef, {
        uid: user.uid,
        username: user.displayName || "Anonim Kullanıcı",
        photoURL: user.photoURL,
        profileEmoji: user.profileEmoji,
        userAvatarFrame: user.userAvatarFrame || '',
        userRole: user.role || 'user',
        text: text,
        createdAt: serverTimestamp(),
        replyTo: replyTo || null,
    });

    batch.update(postRef, {
        commentCount: increment(1)
    });
    
    // Set last action timestamp for rate limiting
    batch.update(userRef, { lastActionTimestamp: serverTimestamp() });

    const postSnap = await getDoc(postRef);
    const postData = postSnap.data();

    if (postData && postData.uid !== user.uid) {
        await createNotification({
            recipientId: postData.uid,
            senderId: user.uid,
            senderUsername: user.displayName || "Biri",
            photoURL: user.photoURL,
            profileEmoji: user.profileEmoji,
            senderAvatarFrame: user.userAvatarFrame,
            type: 'comment',
            postId: postId,
            postImage: postData.imageUrl || null,
            commentText: text,
        });
    }
    
    await handleMentions(text, postId, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        profileEmoji: user.profileEmoji,
        userAvatarFrame: user.userAvatarFrame,
    });

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
