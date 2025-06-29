'use server';

import { db, storage } from "@/lib/firebase";
import { 
    doc, 
    deleteDoc,
    updateDoc,
    increment,
    runTransaction,
    getDoc,
    serverTimestamp,
    arrayRemove,
    arrayUnion,
    addDoc,
    collection
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { findUserByUsername } from "./userActions";

async function handlePostMentions(postId: string, text: string, sender: { uid: string; displayName: string | null; photoURL: string | null; selectedAvatarFrame?: string }) {
    if (!text) return;
    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex);

    if (mentions) {
        const mentionedUsernames = new Set(mentions.map(m => m.substring(1)));

        for (const username of mentionedUsernames) {
            const mentionedUser = await findUserByUsername(username);
            if (mentionedUser && mentionedUser.uid !== sender.uid) {
                const postSnap = await getDoc(doc(db, "posts", postId));
                const postData = postSnap.data();
                await createNotification({
                    recipientId: mentionedUser.uid,
                    senderId: sender.uid,
                    senderUsername: sender.displayName || "Biri",
                    senderAvatar: sender.photoURL,
                    senderAvatarFrame: sender.selectedAvatarFrame,
                    type: 'mention',
                    postId: postId,
                    postImage: postData?.imageUrl || null,
                    commentText: text, // The post text where the mention happened
                });
            }
        }
    }
}

export async function createPost(postData: {
    uid: string;
    username: string;
    userAvatar: string | null;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
    userGender?: 'male' | 'female';
    text: string;
    imageUrl: string;
    editedWithAI?: boolean;
}) {
    const newPostData = {
        ...postData,
        createdAt: serverTimestamp(),
        likes: [],
        likeCount: 0,
        commentCount: 0,
    };
    const postRef = await addDoc(collection(db, 'posts'), newPostData);
    
    await handlePostMentions(postRef.id, postData.text, {
        uid: postData.uid,
        displayName: postData.username,
        photoURL: postData.userAvatar,
        selectedAvatarFrame: postData.userAvatarFrame
    });

    revalidatePath('/home');
    if (postData.uid) {
        revalidatePath(`/profile/${postData.uid}`);
    }

    return { success: true, postId: postRef.id };
}


export async function deletePost(postId: string) {
    if (!postId) throw new Error("Gönderi ID'si gerekli.");
    const postRef = doc(db, "posts", postId);
    try {
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
            return;
        }
        
        const postData = postSnap.data();
        const imageUrl = postData.imageUrl;
        await deleteDoc(postRef);

        if (imageUrl) {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef).catch((error) => {
                if (error.code !== 'storage/object-not-found') {
                    console.error("Storage resmi silinirken hata oluştu:", error);
                }
            });
        }
        revalidatePath('/home');
        if (postData.uid) {
            revalidatePath(`/profile/${postData.uid}`);
        }
    } catch (error) {
        console.error("Gönderi silinirken hata oluştu:", error);
        throw new Error("Gönderi silinemedi.");
    }
}

export async function updatePost(postId: string, newText: string) {
    if (!postId) throw new Error("Gönderi ID'si gerekli.");
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        text: newText,
    });
    const postSnap = await getDoc(postRef);
    if(postSnap.exists()) {
        const postData = postSnap.data();
        revalidatePath('/home');
        revalidatePath(`/profile/${postData.uid}`);
    }
}

export async function likePost(
    postId: string,
    currentUser: { uid: string, displayName: string | null, photoURL: string | null, selectedAvatarFrame?: string }
) {
    const postRef = doc(db, "posts", postId);
    
    await runTransaction(db, async (transaction) => {
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) throw new Error("Gönderi bulunamadı.");
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
            
            if (postData.uid !== currentUser.uid) {
                await createNotification({
                    recipientId: postData.uid,
                    senderId: currentUser.uid,
                    senderUsername: currentUser.displayName || "Biri",
                    senderAvatar: currentUser.photoURL,
                    senderAvatarFrame: currentUser.selectedAvatarFrame,
                    type: 'like',
                    postId: postId,
                    postImage: postData.imageUrl || null,
                });
            }
        }
    });
    revalidatePath('/home');
    revalidatePath(`/profile/*`);
}
