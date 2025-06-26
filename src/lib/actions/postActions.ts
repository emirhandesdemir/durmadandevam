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
import { ref, uploadString, getDownloadURL, deleteObject, uploadBytes } from "firebase/storage";

interface AddPostArgs {
    text: string;
    image: File | string | null; // Artık File veya base64 string olabilir
    user: {
        uid: string;
        displayName: string | null;
        photoURL: string | null;
    };
    role?: 'admin' | 'user';
}

/**
 * Yeni bir gönderi oluşturur, gerekirse resim yükler ve Firestore'a kaydeder.
 * @param {AddPostArgs} args - Gönderi metni, resim dosyası (veya base64 string) ve kullanıcı bilgileri.
 */
export async function addPost({ text, image, user, role }: AddPostArgs) {
    if (!user || !user.uid) {
        throw new Error("Yetkilendirme hatası: Kullanıcı bilgileri eksik.");
    }
    
    let imageUrl = "";
    if (image) {
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_post`);
        
        if (typeof image === 'string') {
            // Eğer resim base64 string ise (AI filtresinden geliyorsa)
            // 'data_url' formatında yükle
            const snapshot = await uploadString(imageRef, image, 'data_url');
            imageUrl = await getDownloadURL(snapshot.ref);
        } else {
            // Eğer resim File nesnesi ise (orijinal yükleme)
            const snapshot = await uploadBytes(imageRef, image);
            imageUrl = await getDownloadURL(snapshot.ref);
        }
    }

    // Yeni gönderi dökümanını Firestore'a ekle
    await addDoc(collection(db, "posts"), {
        uid: user.uid,
        username: user.displayName || "Anonim Kullanıcı",
        userAvatar: user.photoURL,
        userRole: role || 'user', // Kullanıcı rolünü kaydet
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
