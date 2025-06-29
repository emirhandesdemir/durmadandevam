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
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notificationActions";

/**
 * Bir gönderiyi ve (varsa) ilişkili resmini Storage'dan siler.
 * İşlem sonrası ilgili yolları yeniden doğrular.
 * @param postId Silinecek gönderinin ID'si.
 */
export async function deletePost(postId: string) {
    if (!postId) throw new Error("Gönderi ID'si gerekli.");

    const postRef = doc(db, "posts", postId);

    try {
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
            console.log("Silinecek gönderi zaten mevcut değil.");
            return; // Already deleted
        }
        
        const postData = postSnap.data();
        const imageUrl = postData.imageUrl;

        // Firestore belgesini sil
        await deleteDoc(postRef);

        // Eğer resim varsa, Firebase Storage'dan sil
        if (imageUrl) {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef).catch((error) => {
                // Nesne zaten yoksa hatayı yoksay, diğer hataları logla
                if (error.code !== 'storage/object-not-found') {
                    console.error("Storage resmi silinirken hata oluştu:", error);
                }
            });
        }

        // İlgili sayfaların cache'ini temizleyerek güncellenmesini sağla
        revalidatePath('/home');
        if (postData.uid) {
            revalidatePath(`/profile/${postData.uid}`);
        }
        
    } catch (error) {
        console.error("Gönderi silinirken bir hata oluştu:", error);
        throw new Error("Gönderi silinemedi.");
    }
}

/**
 * Bir gönderinin metin içeriğini günceller.
 * İşlem sonrası ilgili yolları yeniden doğrular.
 * @param postId Güncellenecek gönderinin ID'si.
 * @param newText Yeni metin içeriği.
 */
export async function updatePost(postId: string, newText: string) {
    if (!postId) throw new Error("Gönderi ID'si gerekli.");
    
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        text: newText,
        // editedAt: serverTimestamp(), // To show "edited" label if needed
    });

    // Sayfa yenilemesi için cache'i temizle
    const postSnap = await getDoc(postRef);
    if(postSnap.exists()) {
        const postData = postSnap.data();
        revalidatePath('/home');
        revalidatePath(`/profile/${postData.uid}`);
    }
}


/**
 * Bir gönderiyi beğenir veya beğeniyi geri alır ve ilgili yolları yeniden doğrular.
 */
export async function likePost(
    postId: string,
    currentUser: { uid: string, displayName: string | null, photoURL: string | null, selectedAvatarFrame?: string }
) {
    const postRef = doc(db, "posts", postId);
    
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
            
            // Kullanıcı kendi gönderisini beğenirse bildirim gönderme
            if (currentPostData.uid !== currentUser.uid) {
                await createNotification({
                    recipientId: currentPostData.uid,
                    senderId: currentUser.uid,
                    senderUsername: currentUser.displayName || "Biri",
                    senderAvatar: currentUser.photoURL,
                    senderAvatarFrame: currentUser.selectedAvatarFrame,
                    type: 'like',
                    postId: postId,
                    postImage: currentPostData.imageUrl || null,
                });
            }
        }
    });

    // İşlem sonrası revalidate için veriyi tekrar çek.
    const finalPostSnap = await getDoc(postRef);
    if (finalPostSnap.exists()) {
        const postData = finalPostSnap.data();
        revalidatePath('/home');
        revalidatePath(`/profile/${postData.uid}`);
    }
}
