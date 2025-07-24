
// src/lib/actions/adminActions.ts
'use server';

import { db } from '@/lib/firebase';
import { getAuth } from '@/lib/firebaseAdmin';
import { doc, deleteDoc, updateDoc, increment, runTransaction, Timestamp, getDocs, collection, query, where, arrayUnion, writeBatch, arrayRemove, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { deleteRoomWithSubcollections } from '../firestoreUtils';

async function verifyAdmin(adminId: string) {
    if (!adminId) throw new Error("Admin ID required.");
    const adminDoc = await getDoc(doc(db, 'users', adminId));
    if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
        throw new Error("You do not have permission to perform this action.");
    }
}


export async function deleteUserAndContent(userId: string, adminId: string) {
    await verifyAdmin(adminId);
    
    if (!userId) throw new Error("User ID is required.");
    
    try {
        const batch = writeBatch(db);
        
        // 1. Delete user's posts
        const postsQuery = query(collection(db, "posts"), where("uid", "==", userId));
        const postsSnapshot = await getDocs(postsQuery);
        postsSnapshot.forEach((doc) => batch.delete(doc.ref));
        
        // 2. Delete user's comments (This is slow, but necessary for now)
        const commentsQuery = query(collectionGroup(db, "comments"), where("uid", "==", userId));
        const commentsSnapshot = await getDocs(commentsQuery);
        commentsSnapshot.forEach((doc) => batch.delete(doc.ref));
        
        // 3. Delete user's rooms
        const roomsQuery = query(collection(db, 'rooms'), where('createdBy.uid', '==', userId));
        const roomsSnapshot = await getDocs(roomsQuery);
        const roomDeletePromises = roomsSnapshot.docs.map(roomDoc => deleteRoomWithSubcollections(roomDoc.id));
        await Promise.all(roomDeletePromises);
        
        // 4. Delete user's main document
        batch.delete(doc(db, "users", userId));
        
        // 5. Commit all Firestore writes
        await batch.commit();

        // 6. Delete user from Firebase Auth
        const auth = getAuth();
        await auth.deleteUser(userId);
        
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user and content:", error);
        return { success: false, error: "Kullanıcı ve içeriği silinirken bir hata oluştu." };
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

export async function manageUserPremium(userId: string, durationDays: number | null) {
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");

    const userRef = doc(db, 'users', userId);

    return await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");

        const userData = userDoc.data();
        const updates: { [key: string]: any } = {};

        if (durationDays !== null) {
            // Granting or extending premium
            const newExpiry = Timestamp.fromMillis(Date.now() + durationDays * 24 * 60 * 60 * 1000);
            updates.premiumUntil = newExpiry;
            
            // Grant first-time bonus if applicable
            if (!userData.isFirstPremium) {
                updates.isFirstPremium = true;
                updates.diamonds = increment(100);
                // Add 3 days of unlimited room creation
                updates.unlimitedRoomCreationUntil = Timestamp.fromMillis(Date.now() + 3 * 24 * 60 * 60 * 1000);
            }
        } else {
            // Revoking premium
            updates.premiumUntil = null;
        }

        transaction.update(userRef, updates);
        revalidatePath('/admin/users');
        return { success: true };
    });
}
