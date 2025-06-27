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
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

/**
 * Bir gönderiyi siler ve eğer varsa ilişkili resmi Storage'dan kaldırır.
 * @param postId Silinecek gönderinin ID'si.
 * @param imageUrl Gönderiye ait resmin URL'si (varsa).
 */
export async function deletePost(postId: string, imageUrl?: string) {
    const postRef = doc(db, "posts", postId);
    await deleteDoc(postRef);

    if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(error => {
            // Eğer dosya zaten yoksa veya başka bir hata olursa logla, ama işlemi durdurma
            console.error("Storage resmi silinirken hata oluştu (göz ardı edilebilir):", error);
        });
    }
    // Not: Alt koleksiyondaki yorumları silmek için bir 'Cloud Function' kullanmak daha verimlidir.
    // Bu örnekte, istemci tarafında basitlik için bu adım atlanmıştır.
}

/**
 * Bir gönderinin metin içeriğini günceller.
 * @param postId Güncellenecek gönderinin ID'si.
 * @param newText Yeni metin içeriği.
 */
export async function updatePost(postId: string, newText: string) {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        text: newText
    });
}


/**
 * Bir gönderiyi beğenir veya beğeniyi geri alır.
 * @param postId Beğenilecek gönderinin ID'si.
 * @param userId Beğenen kullanıcının ID'si.
 * @param isCurrentlyLiked Kullanıcının gönderiyi şu an beğenip beğenmediği.
 */
export async function likePost(postId: string, userId: string, isCurrentlyLiked: boolean) {
    const postRef = doc(db, "posts", postId);
    const batch = writeBatch(db);

    if (isCurrentlyLiked) {
        batch.update(postRef, {
            likes: arrayRemove(userId),
            likeCount: increment(-1)
        });
    } else {
        batch.update(postRef, {
            likes: arrayUnion(userId),
            likeCount: increment(1)
        });
    }
    await batch.commit();
}
