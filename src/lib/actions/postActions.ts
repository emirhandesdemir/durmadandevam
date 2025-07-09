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
import { ref, deleteObject } from "firebase/storage";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { findUserByUsername } from "./userActions";

async function handlePostMentions(postId: string, text: string, sender: { uid: string; displayName: string | null; photoURL: string | null; }) {
    if (!text) return;
    const mentionRegex = /(?<!\S)@\w+/g;
    const mentions = text.match(mentionRegex);

    if (mentions) {
        const mentionedUsernames = new Set(mentions);

        for (const username of mentions) {
            const cleanUsername = username.substring(1);
            if (cleanUsername) {
                const mentionedUser = await findUserByUsername(cleanUsername);
                if (mentionedUser && mentionedUser.uid !== sender.uid) {
                    const postSnap = await getDoc(doc(db, "posts", postId));
                    const postData = postSnap.data();
                    await createNotification({
                        recipientId: mentionedUser.uid,
                        senderId: sender.uid,
                        senderUsername: sender.displayName || "Biri",
                        senderAvatar: sender.photoURL,
                        type: 'mention',
                        postId: postId,
                        postImage: postData?.imageUrl || null,
                        commentText: text, // The post text where the mention happened
                    });
                }
            }
        }
    }
}

export async function createPost(postData: {
    uid: string;
    username: string;
    userAvatar: string | null;
    userAvatarFrame: string;
    userRole?: 'admin' | 'user';
    userGender?: 'male' | 'female';
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    editedWithAI?: boolean;
    language: string;
    commentsDisabled?: boolean;
    likesHidden?: boolean;
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
            commentsDisabled: postData.commentsDisabled ?? false,
            likesHidden: postData.likesHidden ?? false,
        };
        transaction.set(newPostRef, newPostData);
        
        const userUpdates: { [key: string]: any } = {
            lastActionTimestamp: serverTimestamp(),
            postCount: increment(1)
        };

        if (postCount === 0 && !postData.videoUrl) { // Only give reward for first non-video post
            userUpdates.diamonds = increment(90);
        }
        
        transaction.update(userRef, userUpdates);
    });

    await handlePostMentions(finalPostId, postData.text, {
        uid: postData.uid,
        displayName: postData.username,
        photoURL: postData.userAvatar,
    });

    revalidatePath('/home');
    if (postData.videoUrl) {
      revalidatePath('/surf');
    }
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
                try {
                    const imageRef = ref(storage, postData.imageUrl);
                    await deleteObject(imageRef);
                } catch(error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.error("Storage resmi silinirken hata oluştu:", error);
                    }
                }
            }
            if (postData.videoUrl) {
                 try {
                    const videoRef = ref(storage, postData.videoUrl);
                    await deleteObject(videoRef);
                } catch(error: any) {
                    if (error.code !== 'storage/object-not-found') {
                        console.error("Storage videosu silinirken hata oluştu:", error);
                    }
                }
            }
        });
        revalidatePath('/home');
        revalidatePath('/surf');
    } catch (error) {
        console.error("Gönderi silinirken hata oluştu:", error);
        throw new Error("Gönderi silinemedi.");
    }
}

export async function updatePost(postId: string, updates: { text?: string; commentsDisabled?: boolean; likesHidden?: boolean; }) {
    if (!postId) throw new Error("Gönderi ID'si gerekli.");
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        ...updates,
        editedAt: serverTimestamp() // Add an edited timestamp
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
                    type: 'like',
                    postId: postId,
                    postImage: postData.imageUrl || null,
                });
            }
        }
    });
    revalidatePath('/home');
    revalidatePath(`/profile/*`);
    revalidatePath('/surf');
}


export async function retweetPost(
    originalPostId: string,
    retweeter: { 
        uid: string; 
        username: string; 
        userAvatar: string | null;
        userAvatarFrame: string | undefined;
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
            text: originalPostData.text,
            imageUrl: originalPostData.imageUrl,
            videoUrl: originalPostData.videoUrl,
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
            videoUrl: '', // Retweet has no video of its own
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
    
    const originalPostData = (await getDoc(originalPostRef)).data();
    if(originalPostData) {
        await createNotification({
            recipientId: originalPostData.uid,
            senderId: retweeter.uid,
            senderUsername: retweeter.username,
            senderAvatar: retweeter.userAvatar,
            type: 'retweet',
            postId: newPostRef.id,
        });
    }


    revalidatePath('/home');
    revalidatePath(`/profile/${retweeter.uid}`);
}
