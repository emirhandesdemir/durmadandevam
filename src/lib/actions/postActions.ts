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
import { ref, deleteObject, uploadString, getDownloadURL } from "firebase/storage";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { findUserByUsername } from "./userActions";
import { emojiToDataUrl } from "../utils";

async function handlePostMentions(postId: string, text: string, sender: { uid: string; displayName: string | null; photoURL: string | null; profileEmoji?: string | null; userAvatarFrame?: string }) {
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
                        photoURL: sender.photoURL,
                        profileEmoji: sender.profileEmoji,
                        senderAvatarFrame: sender.userAvatarFrame,
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

export async function createProfileUpdatePost(data: {
    userId: string;
    username: string;
    profileEmoji: string;
    text: string;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
}) {
    // Generate an image from the emoji
    const emojiImageUrl = await emojiToDataUrl(data.profileEmoji);

    return createPost({
        uid: data.userId,
        username: data.username,
        photoURL: null, // User's actual photoURL is not used for this special post
        profileEmoji: data.profileEmoji,
        userAvatarFrame: data.userAvatarFrame,
        userRole: data.userRole,
        text: data.text,
        imageUrl: emojiImageUrl, // Use the generated emoji image
        language: 'tr', // Default or detect user language
        commentsDisabled: true, // Typically these posts don't need comments
        likesHidden: false,
    });
}


export async function createPost(postData: {
    uid: string;
    username: string;
    photoURL: string | null;
    profileEmoji: string | null;
    userAvatarFrame?: string;
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
            uid: postData.uid,
            username: postData.username,
            photoURL: postData.photoURL,
            profileEmoji: postData.profileEmoji,
            userAvatarFrame: postData.userAvatarFrame,
            userRole: postData.userRole,
            userGender: postData.userGender,
            text: postData.text,
            imageUrl: postData.imageUrl || null, 
            videoUrl: postData.videoUrl || null,
            editedWithAI: postData.editedWithAI,
            language: postData.language,
            commentsDisabled: postData.commentsDisabled,
            likesHidden: postData.likesHidden,
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
            saveCount: 0,
            savedBy: [],
        };
        transaction.set(newPostRef, newPostData);
        
        const userUpdates: { [key: string]: any } = {
            lastActionTimestamp: serverTimestamp(),
            postCount: increment(1)
        };

        if (postCount === 0 && !postData.videoUrl) {
            userUpdates.diamonds = increment(90);
        }
        
        transaction.update(userRef, userUpdates);
    });

    await handlePostMentions(finalPostId, postData.text, {
        uid: postData.uid,
        displayName: postData.username,
        photoURL: postData.photoURL,
        profileEmoji: postData.profileEmoji,
        userAvatarFrame: postData.userAvatarFrame
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

            // Do not delete from storage if it's an emoji data URL
            if (postData.imageUrl && !postData.imageUrl.startsWith('data:image/svg+xml')) {
                try {
                    const imageStorageRef = ref(storage, postData.imageUrl);
                    await deleteObject(imageStorageRef);
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
        revalidatePath('/surf');
    }
}


export async function likePost(
    postId: string,
    currentUser: { uid: string, displayName: string | null, photoURL: string | null, profileEmoji: string | null, userAvatarFrame?: string }
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
                    photoURL: currentUser.photoURL,
                    profileEmoji: currentUser.profileEmoji,
                    senderAvatarFrame: currentUser.userAvatarFrame,
                    type: 'like',
                    postId: postId,
                    postImage: postData.imageUrl || null,
                });
            }
        }
    });
    revalidatePath('/home');
    revalidatePath('/surf');
    revalidatePath(`/profile/*`);
}

export async function toggleSavePost(postId: string, userId: string) {
    if (!postId || !userId) {
        throw new Error("Post ID and User ID are required.");
    }

    const postRef = doc(db, "posts", postId);
    const userRef = doc(db, "users", userId);

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const postDoc = await transaction.get(postRef);

        if (!userDoc.exists()) throw new Error("User not found.");
        if (!postDoc.exists()) throw new Error("Post not found.");

        const userData = userDoc.data();
        
        const isCurrentlySaved = (userData.savedPosts || []).includes(postId);

        if (isCurrentlySaved) {
            // Unsave the post
            transaction.update(userRef, { savedPosts: arrayRemove(postId) });
            transaction.update(postRef, {
                savedBy: arrayRemove(userId),
                saveCount: increment(-1)
            });
        } else {
            // Save the post
            transaction.update(userRef, { savedPosts: arrayUnion(postId) });
            transaction.update(postRef, {
                savedBy: arrayUnion(userId),
                saveCount: increment(1)
            });
        }
    });

    revalidatePath('/home');
    revalidatePath('/surf');
    revalidatePath(`/profile/${userId}`);
}


export async function retweetPost(
    originalPostId: string,
    retweeter: { 
        uid: string; 
        username: string; 
        photoURL: string | null;
        profileEmoji: string | null;
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
            photoURL: originalPostData.photoURL,
            profileEmoji: originalPostData.profileEmoji,
            userAvatarFrame: originalPostData.userAvatarFrame,
            text: originalPostData.text,
            imageUrl: originalPostData.imageUrl,
            videoUrl: originalPostData.videoUrl,
            createdAt: originalPostData.createdAt,
        };

        const newPostData = {
            uid: retweeter.uid,
            username: retweeter.username,
            photoURL: retweeter.photoURL,
            profileEmoji: retweeter.profileEmoji,
            userAvatarFrame: retweeter.userAvatarFrame,
            userRole: retweeter.userRole,
            userGender: retweeter.userGender,
            text: quoteText || '',
            imageUrl: '', 
            videoUrl: '', 
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
            photoURL: retweeter.photoURL,
            profileEmoji: retweeter.profileEmoji,
            senderAvatarFrame: retweeter.userAvatarFrame,
            type: 'retweet',
            postId: newPostRef.id,
        });
    }


    revalidatePath('/home');
    revalidatePath(`/profile/${retweeter.uid}`);
}
