'use server';

import { db, storage } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { revalidatePath } from "next/cache";

interface UpdateUserArgs {
    uid: string;
    username: string;
    avatarDataUrl?: string | null;
    selectedBubble?: string;
}

export async function updateUserProfile({ uid, username, avatarDataUrl, selectedBubble }: UpdateUserArgs) {
    if (!uid) {
        throw new Error("Kullanıcı ID'si gerekli.");
    }

    const userDocRef = doc(db, 'users', uid);
    const updates: { [key: string]: any } = {};
    let newPhotoURL: string | null = null;

    try {
        if (avatarDataUrl) {
            const storageRef = ref(storage, `avatars/${uid}`);
            const snapshot = await uploadString(storageRef, avatarDataUrl, 'data_url');
            newPhotoURL = await getDownloadURL(snapshot.ref);
            updates.photoURL = newPhotoURL;
        }

        if (username) {
            updates.username = username;
        }

        if (typeof selectedBubble === 'string') {
            updates.selectedBubble = selectedBubble;
        }
        
        if (Object.keys(updates).length > 0) {
            await updateDoc(userDocRef, updates);
        }

        // Revalidate paths to show updated info
        revalidatePath('/profile');
        revalidatePath('/home');

        return { success: true, data: { newPhotoURL } };
    } catch (error: any) {
        console.error("Profil güncellenirken hata:", error);
        return { success: false, error: "Profil güncellenemedi." };
    }
}
