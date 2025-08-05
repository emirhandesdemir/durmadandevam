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
    collection,
    writeBatch,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";
import { findUserByUsername } from "../server-utils";
import { ref as storageRef, deleteObject, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';


async function handlePostMentions(postId: string, text: string, sender: { uid: string; displayName: string | null; photoURL: string | null; userAvatarFrame?: string }) {
    if (!text) return;
    const mentionRegex = /(?<!\S)@\w+/g;
    const mentions = text.match(mentionRegex);

    if (mentions) {
        const mentionedUsernames = new Set(mentions.map(m => m.substring(1))); // Remove @ and get unique usernames
        for (const username of mentionedUsernames) {
            if (username) { // Ensure username is not empty
                const mentionedUser = await findUserByUsername(username);
                if (mentionedUser && mentionedUser.uid !== sender.uid) {
                    const postSnap = await getDoc(doc(db, "posts", postId));
                    const postData = postSnap.data();
                    await createNotification({
                        recipientId: mentionedUser.uid,
                        senderId: sender.uid,
                        senderUsername: sender.displayName || "Biri",
                        senderAvatar: sender.photoURL || '',
                        senderAvatarFrame: sender.userAvatarFrame || '',
                        type: 'mention',
                        postId: postId,
                        postImage: postData?.imageUrl || null,
                        commentText: text,
                    });
                }
            }
        }
    }
}


export async function createPost(postData: {
    uid: string;
    username: string;
    userPhotoURL: string | null;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
    userGender?: 'male' | 'female';
    text: string;
    imageUrl: string | null;
    videoUrl: string | null;
    language: string;
    commentsDisabled?: boolean;
    likesHidden?: boolean;
    backgroundStyle?: string;
    videoThumbnailUrl?: string | null;
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
            userPhotoURL: postData.userPhotoURL || null,
            userAvatarFrame: postData.userAvatarFrame || '',
            userRole: postData.userRole,
            userGender: postData.userGender,
            text: postData.text,
            imageUrl: postData.imageUrl,
            videoUrl: postData.videoUrl,
            videoThumbnailUrl: postData.videoThumbnailUrl || null,
            backgroundStyle: postData.backgroundStyle || '',
            editedWithAI: false,
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
            userUpdates.diamonds = increment(50);
        }
        
        transaction.update(userRef, userUpdates);
    });

    await handlePostMentions(finalPostId, postData.text, {
        uid: postData.uid,
        displayName: postData.username,
        photoURL: postData.userPhotoURL || '',
        userAvatarFrame: postData.userAvatarFrame
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

            if (postData.imageUrl) {
                try {
                    const imageRef = storageRef(storage, postData.imageUrl);
                    await deleteObject(imageRef);
                } catch (error) {
                    if ((error as any).code !== 'storage/object-not-found') {
                        console.error("Storage resmi silinirken hata oluştu:", error);
                    }
                }
            }
            if (postData.videoUrl) {
                 try {
                    const videoRef = storageRef(storage, postData.videoUrl);
                    await deleteObject(videoRef);
                } catch (error) {
                    if ((error as any).code !== 'storage/object-not-found') {
                        console.error("Storage videosu silinirken hata oluştu:", error);
                    }
                }
            }

            transaction.delete(postRef);
            transaction.update(userRef, { postCount: increment(-1) });
        });
        revalidatePath('/home');
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
        editedAt: serverTimestamp()
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
    currentUser: { uid: string, displayName: string, photoURL: string | null, userAvatarFrame?: string }
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
                    senderAvatar: currentUser.photoURL || '',
                    senderAvatarFrame: currentUser.userAvatarFrame || '',
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
            transaction.update(userRef, { savedPosts: arrayRemove(postId) });
            transaction.update(postRef, {
                savedBy: arrayRemove(userId),
                saveCount: increment(-1)
            });
        } else {
            transaction.update(userRef, { savedPosts: arrayUnion(postId) });
            transaction.update(postRef, {
                savedBy: arrayUnion(userId),
                saveCount: increment(1)
            });
        }
    });

    revalidatePath('/home');
    revalidatePath(`/profile/${userId}`);
}


export async function retweetPost(
    originalPostId: string,
    retweeter: { 
        uid: string; 
        username: string; 
        photoURL: string | null;
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
            userPhotoURL: originalPostData.userPhotoURL,
            userAvatarFrame: originalPostData.userAvatarFrame,
            text: originalPostData.text,
            imageUrl: originalPostData.imageUrl,
            videoUrl: originalPostData.videoUrl,
            createdAt: originalPostData.createdAt,
        };

        const newPostData = {
            uid: retweeter.uid,
            username: retweeter.username,
            userPhotoURL: retweeter.photoURL,
            userAvatarFrame: retweeter.userAvatarFrame,
            userRole: retweeter.userRole,
            userGender: retweeter.userGender,
            text: quoteText || '',
            imageUrl: null, 
            videoUrl: null, 
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
            senderAvatar: retweeter.photoURL || '',
            senderAvatarFrame: retweeter.userAvatarFrame || '',
            type: 'retweet',
            postId: newPostRef.id,
        });
    }

    revalidatePath('/home');
    revalidatePath(`/profile/${retweeter.uid}`);
}

export async function getRecentImagePosts(userId: string, imageLimit: number = 3) {
    if (!userId) return [];
    
    const postsRef = collection(db, "posts");
    const q = query(
        postsRef,
        where('uid', '==', userId),
        where('imageUrl', '!=', null),
        orderBy('imageUrl'),
        orderBy('createdAt', 'desc'),
        limit(imageLimit)
    );

    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching recent image posts (likely requires index):", error);
        // Fallback to a simpler query if the index is missing
        const fallbackQuery = query(
            postsRef,
            where('uid', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(10) // Fetch more to find images
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        return fallbackSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(post => !!post.imageUrl)
            .slice(0, imageLimit);
    }
}
