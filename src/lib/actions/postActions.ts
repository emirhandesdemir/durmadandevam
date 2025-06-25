// src/lib/actions/postActions.ts
'use server';

import { db, storage } from "@/lib/firebase";
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    doc, 
    writeBatch, 
    arrayUnion, 
    arrayRemove,
    getDoc,
    deleteDoc,
    updateDoc,
    increment,
    runTransaction
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

interface AddPostArgs {
    text: string;
    imageFile: File | null;
    user: {
        uid: string;
        displayName: string | null;
        photoURL: string | null;
    };
}

/**
 * Yeni bir gönderi oluşturur, gerekirse resim yükler ve Firestore'a kaydeder.
 * @param {AddPostArgs} args - Gönderi metni, resim dosyası ve kullanıcı bilgileri.
 */
export async function addPost({ text, imageFile, user }: AddPostArgs) {
    if (!user || !user.uid) {
        throw new Error("Yetkilendirme hatası: Kullanıcı bilgileri eksik.");
    }
    
    let imageUrl = "";
    if (imageFile) {
        // Resmi Firebase Storage'a yükle
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref); // Yüklenen resmin URL'ini al
    }

    // Yeni gönderi dökümanını Firestore'a ekle
    await addDoc(collection(db, "posts"), {
        uid: user.uid,
        username: user.displayName || "Anonim Kullanıcı",
        userAvatar: user.photoURL,
        text: text,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likes: [],
        likeCount: 0,
        commentCount: 0,
    });
}

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
