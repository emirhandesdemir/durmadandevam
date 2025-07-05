// src/lib/actions/postActions.ts
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
import { ref, deleteObject, uploadBytes } from "firebase/storage";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { findUserByUsername } from "./userActions";

async function handlePostMentions(postId: string, text: string, sender: { uid: string; displayName: string | null; photoURL: string | null; selectedAvatarFrame?: string }) {
    if (!text) return;
    const mentionRegex = /(?<!\S)@\w+/g;
    const mentions = text.match(mentionRegex);

    if (mentions) {
        const mentionedUsernames = new Set(mentions);

        for (const username of mentions) {
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
    language: string;
}) {
    const newPostRef = doc(collection(db, 'posts'));
    const userRef = doc(db, 'users', postData.uid);
    let finalPostId = newPostRef.id;

    await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found.");
        
        const userData = userSnap.data();
        const postCount = userData.postCount || 0;
        
        const newPostData = {
            ...postData,
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
        };
        transaction.set(newPostRef, newPostData);
        
        const userUpdates: { [key: string]: any } = {
            lastActionTimestamp: serverTimestamp(),
            postCount: increment(1)
        };

        if (postCount === 0) {
            // First post, give 90 more diamonds (10 already given at signup)
            userUpdates.diamonds = increment(90);
        }
        
        transaction.update(userRef, userUpdates);
    });

    await handlePostMentions(finalPostId, postData.text, {
        uid: postData.uid,
        displayName: postData.username,
        photoURL: postData.userAvatar,
        selectedAvatarFrame: postData.userAvatarFrame
    });

    revalidatePath('/home');
    if (postData.uid) {
        revalidatePath(`/profile/${postData.uid}`);
    }

    return { success: true, postId: finalPostId };
}


export async function deletePost(postId: string) {
    if (!postId) throw new Error("Gönderi ID'si gerekli.");
    const postRef = doc(db, "posts", postId);
    try {
        await runTransaction(db, async (transaction) => {
            const postSnap = await transaction.get(postRef);
            if (!postSnap.exists()) {
                console.log("Post already deleted.");
                return;
            }
            
            const postData = postSnap.data();
            const userRef = doc(db, 'users', postData.uid);

            transaction.delete(postRef);
            transaction.update(userRef, { postCount: increment(-1) });

            if (postData.imageUrl) {
                const imageRef = ref(storage, postData.imageUrl);
                await deleteObject(imageRef).catch((error) => {
                    if (error.code !== 'storage/object-not-found') {
                        console.error("Storage resmi silinirken hata oluştu:", error);
                    }
                });
            }
        });
        revalidatePath('/home');
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


export async function retweetPost(
    originalPostId: string,
    retweeter: { 
        uid: string; 
        username: string; 
        userAvatar: string | null;
        userAvatarFrame?: string;
        userRole?: 'admin' | 'user';
        userGender?: 'male' | 'female';
    },
    quoteText?: string
) {
    if (!originalPostId || !retweeter?.uid) throw new Error("Gerekli bilgiler eksik.");

    const originalPostRef = doc(db, 'posts', originalPostId);
    const retweeterUserRef = doc(db, 'users', retweeter.uid);
    const newPostRef = doc(collection(db, 'posts'));

    await runTransaction(db, async (transaction) => {
        const originalPostDoc = await transaction.get(originalPostRef);
        if (!originalPostDoc.exists()) throw new Error("Orijinal gönderi bulunamadı.");

        const originalPostData = originalPostDoc.data();
        if (originalPostData.uid === retweeter.uid) throw new Error("Kendi gönderinizi retweetleyemezsiniz.");
        if (originalPostData.retweetOf) throw new Error("Bir retweet'i retweetleyemezsiniz.");

        const retweetSnapshot = {
            postId: originalPostId,
            uid: originalPostData.uid,
            username: originalPostData.username,
            userAvatar: originalPostData.userAvatar,
            userAvatarFrame: originalPostData.userAvatarFrame,
            text: originalPostData.text,
            imageUrl: originalPostData.imageUrl,
            createdAt: originalPostData.createdAt,
        };

        const newPostData = {
            uid: retweeter.uid,
            username: retweeter.username,
            userAvatar: retweeter.userAvatar,
            userAvatarFrame: retweeter.userAvatarFrame,
            userRole: retweeter.userRole,
            userGender: retweeter.userGender,
            text: quoteText || '', // Use the quote text here
            imageUrl: '', // Retweet has no image of its own
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
            retweetOf: retweetSnapshot
        };

        transaction.set(newPostRef, newPostData);
        transaction.update(retweeterUserRef, { 
            postCount: increment(1),
            lastActionTimestamp: serverTimestamp()
        });
    });
    
    // Notification for the original poster
    const originalPostData = (await getDoc(originalPostRef)).data();
    if(originalPostData) {
        await createNotification({
            recipientId: originalPostData.uid,
            senderId: retweeter.uid,
            senderUsername: retweeter.username,
            senderAvatar: retweeter.userAvatar,
            senderAvatarFrame: retweeter.userAvatarFrame,
            type: 'retweet',
            postId: newPostRef.id,
        });
    }


    revalidatePath('/home');
    revalidatePath(`/profile/${retweeter.uid}`);
}
