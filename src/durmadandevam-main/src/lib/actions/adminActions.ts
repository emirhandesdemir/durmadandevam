// src/lib/actions/adminActions.ts
'use server';

import { db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Bir kullanıcının Firestore veritabanı kaydını siler.
 * Not: Bu işlem, Firebase Authentication kaydını silmez. 
 * Tam bir silme için bir Cloud Function tetikleyicisi gerekir.
 * @param uid Silinecek kullanıcının ID'si.
 */
export async function deleteUserFromFirestore(uid: string) {
    if (!uid) throw new Error("Kullanıcı ID'si gerekli.");
    
    try {
        const userDocRef = doc(db, 'users', uid);
        await deleteDoc(userDocRef);
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error("Firestore'dan kullanıcı silinirken hata:", error);
        return { success: false, error: "Kullanıcı silinemedi." };
    }
}

/**
 * Bir kullanıcının rolünü günceller (admin veya user).
 * @param uid Rolü güncellenecek kullanıcının ID'si.
 * @param newRole Kullanıcının yeni rolü.
 */
export async function updateUserRole(uid: string, newRole: 'admin' | 'user') {
     if (!uid || !newRole) throw new Error("Kullanıcı ID'si ve yeni rol gerekli.");

    try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, { role: newRole });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error)
    {
        console.error("Kullanıcı rolü güncellenirken hata:", error);
        return { success: false, error: "Rol güncellenemedi." };
    }
}

/**
 * Bir kullanıcının elmas miktarını günceller.
 * @param uid Elmas miktarı güncellenecek kullanıcının ID'si.
 * @param amount Eklenecek veya çıkarılacak elmas miktarı (negatif olabilir).
 */
export async function modifyUserDiamonds(uid: string, amount: number) {
    if (!uid) throw new Error("Kullanıcı ID'si gerekli.");
    if (typeof amount !== 'number' || !Number.isInteger(amount)) {
        throw new Error("Geçersiz miktar.");
    }
    
    try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, {
            diamonds: increment(amount)
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error("Kullanıcı elmasları güncellenirken hata:", error);
        return { success: false, error: "Elmaslar güncellenemedi." };
    }
}

export async function banUser(uid: string, ban: boolean) {
    if (!uid) throw new Error("Kullanıcı ID'si gerekli.");
    try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, { isBanned: ban });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error(`Kullanıcı ${ban ? 'yasaklanırken' : 'yasağı kaldırılırken'} hata:`, error);
        return { success: false, error: 'İşlem gerçekleştirilemedi.' };
    }
}
