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
    runTransaction,
    collection,
    serverTimestamp,
    addDoc,
    getDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { revalidatePath } from "next/cache";

interface CreatePostArgs {
    uid: string;
    username: string;
    userAvatar?: string | null;
    userAvatarFrame?: string;
    userRole?: 'admin' | 'user';
    text: string;
    imageUrl?: string;
}

export async function createPost(args: CreatePostArgs) {
    const { uid, username, userAvatar, userAvatarFrame, userRole, text, imageUrl } = args;

    if (!uid) {
        throw new Error("Kullanıcı doğrulanmadı.");
    }
    if (!text.trim() && !imageUrl) {
        throw new Error("Gönderi metin veya resim içermelidir.");
    }

    try {
        await addDoc(collection(db, 'posts'), {
            uid,
            username,
            userAvatar,
            userAvatarFrame: userAvatarFrame || '',
            userRole: userRole || 'user',
            text,
            imageUrl: imageUrl || "",
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
        });
    } catch (error) {
        console.error("Firestore doküman oluşturma hatası:", error);
        throw new Error("Gönderi oluşturulamadı. Veritabanı hatası.");
    }
    
    revalidatePath('/home');
    revalidatePath(`/profile/${uid}`);

    return { success: true };
}


export async function deletePost(postId: string, imageUrl?: string) {
    const postRef = doc(db, "posts", postId);
    
    await deleteDoc(postRef);

    if (imageUrl) {
        try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.error("Storage resmi silinirken hata oluştu:", error);
            }
        }
    }
}


export async function updatePost(postId: string, newText: string) {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        text: newText
    });
}

export async function likePost(
    postId: string,
    currentUser: { uid: string, displayName: string | null, photoURL: string | null }
) {
    const postRef = doc(db, "posts", postId);
    
    const postData = (await getDoc(postRef)).data();
    if (!postData) throw new Error("Gönderi bulunamadı.");
    
    await runTransaction(db, async (transaction) => {
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) {
            throw new Error("Gönderi bulunamadı.");
        }
        const currentPostData = postSnap.data();
        const isCurrentlyLiked = (currentPostData.likes || []).includes(currentUser.uid);

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
            
            if (currentPostData.uid !== currentUser.uid) {
                const notificationsRef = collection(db, 'notifications');
                const newNotifRef = doc(notificationsRef);
                transaction.set(newNotifRef, {
                    recipientId: currentPostData.uid,
                    senderId: currentUser.uid,
                    senderUsername: currentUser.displayName || "Biri",
                    senderAvatar: currentUser.photoURL,
                    type: 'like',
                    postId: postId,
                    postImage: currentPostData.imageUrl || null,
                    createdAt: serverTimestamp(),
                    read: false,
                });
                
                const recipientUserRef = doc(db, 'users', currentPostData.uid);
                transaction.update(recipientUserRef, {
                    hasUnreadNotifications: true
                });
            }
        }
    });

    revalidatePath(`/profile/${postData.uid}`);
    revalidatePath(`/home`);
}
