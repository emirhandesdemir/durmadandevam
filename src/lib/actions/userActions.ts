// src/lib/actions/userActions.ts
'use server';

import { db, storage } from '@/lib/firebase';
import type { Report, UserProfile, Post, Comment } from '../types';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, limit, writeBatch, serverTimestamp, increment, arrayRemove, addDoc, orderBy, setDoc, collectionGroup, deleteField, Transaction, WriteBatch } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { deepSerialize } from '../server-utils';
import { revalidatePath } from 'next/cache';
import { getAuth } from '../firebaseAdmin';
import { deleteRoomWithSubcollections } from '../firestoreUtils';

// Helper function to process queries in batches to avoid Firestore limits
async function processQueryInBatches(transaction: Transaction | WriteBatch, queryToProcess: any, updateData: any) {
    const snapshot = await getDocs(queryToProcess);
    if (snapshot.empty) return;

    snapshot.docs.forEach((doc) => {
        transaction.update(doc.ref, updateData);
    });
}

// Propagates username/avatar changes to all posts
async function updateUserPosts(transaction: Transaction | WriteBatch, uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;
    
    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.userAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.userAvatarFrame;
    if (updates.profileEmoji) propagationUpdates.profileEmoji = updates.profileEmoji;
    
    if (Object.keys(propagationUpdates).length === 0) return;

    const userPostsQuery = query(collection(db, 'posts'), where('uid', '==', uid));
    await processQueryInBatches(transaction, userPostsQuery, propagationUpdates);
}

// Propagates username/avatar changes to all comments
async function updateUserComments(transaction: Transaction | WriteBatch, uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;

    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.userAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.userAvatarFrame;
    if (updates.profileEmoji) propagationUpdates.profileEmoji = updates.profileEmoji;
    
    if (Object.keys(propagationUpdates).length === 0) return;

    const commentsQuery = query(collectionGroup(db, 'comments'), where('uid', '==', uid));
    await processQueryInBatches(transaction, commentsQuery, propagationUpdates);
}


export async function findUserByUsername(username: string): Promise<UserProfile | null> {
    if (!username) return null;
    const usersRef = collection(db, 'users');
    // Perform a case-insensitive search by querying on a lowercase version
    const q = query(usersRef, where('username', '==', username.toLowerCase()), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const userDoc = snapshot.docs[0];
    const userData = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
    return deepSerialize(userData);
}

export async function updateUserProfile(updates: {
    userId: string;
    username?: string;
    bio?: string;
    age?: number | string;
    city?: string;
    country?: string;
    gender?: 'male' | 'female';
    privateProfile?: boolean;
    acceptsFollowRequests?: boolean;
    showOnlineStatus?: boolean;
    photoURL?: string | null;
    profileEmoji?: string | null;
    selectedBubble?: string;
    selectedAvatarFrame?: string;
    interests?: string[];
}) {
    const { userId, ...otherUpdates } = updates;
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");

    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
        const userData = userDoc.data();

        const updatesForDb: { [key: string]: any } = { ...otherUpdates };
        
        if (updates.age === '' || updates.age === undefined || updates.age === null) {
            updatesForDb.age = deleteField();
        } else if (updates.age !== undefined) {
            updatesForDb.age = Number(updates.age);
        }
        
        if (updates.username && userData.username !== updates.username) {
            const newUsernameLower = updates.username.toLowerCase();
            const existingUserQuery = query(collection(db, 'users'), where('username', '==', newUsernameLower), limit(1));
            const existingUserSnapshot = await getDocs(existingUserQuery);
            if (!existingUserSnapshot.empty && existingUserSnapshot.docs[0].id !== userId) {
                 throw new Error("Bu kullanıcı adı zaten başka birisi tarafından kullanılıyor.");
            }
            updatesForDb.username = updates.username;
        }

        if (Object.keys(updatesForDb).length > 0) {
            transaction.update(userRef, updatesForDb);
        }

        const auth = getAuth();
        const authUpdates: { displayName?: string, photoURL?: string | null } = {};
        if (updates.username) authUpdates.displayName = updates.username;
        if (updates.photoURL !== undefined) authUpdates.photoURL = updates.photoURL;

        if (Object.keys(authUpdates).length > 0) {
            await auth.updateUser(userId, authUpdates);
        }

        const propagationUpdates: { [key: string]: any } = {};
        if (updates.username) propagationUpdates.username = updates.username;
        if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
        if (updates.selectedAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;
        if (updates.profileEmoji) propagationUpdates.profileEmoji = updates.profileEmoji;
        
        if (Object.keys(propagationUpdates).length > 0) {
             await Promise.all([
                updateUserPosts(transaction, userId, propagationUpdates),
                updateUserComments(transaction, userId, propagationUpdates),
            ]).catch(err => {
                console.error("Propagasyon hatası (transaction içinde):", err);
                // Don't rethrow, let the main transaction complete if possible
            });
        }
    });

    revalidatePath(`/profile/${userId}`, 'layout');
    return { success: true };
}


export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
    if (!searchTerm.trim()) return [];

    const usersRef = collection(db, 'users');
    const q = query(
        usersRef,
        orderBy('username'),
        where('username', '>=', searchTerm.toLowerCase()),
        where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
        limit(10)
    );

    const snapshot = await getDocs(q);
    
    const users = snapshot.docs
        .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
        .filter(user => user.uid !== currentUserId);

    return deepSerialize(users);
}

// ... other actions

export async function submitReport(reportData: Omit<Report, 'id' | 'timestamp'>) {
    if (!reportData.reporterId || !reportData.reportedUserId) {
        throw new Error("Raporlayan ve raporlanan kullanıcı ID'leri gereklidir.");
    }
    
    const reportsRef = collection(db, 'reports');
    const reportedUserRef = doc(db, 'users', reportData.reportedUserId);
    const reporterUserRef = doc(db, 'users', reportData.reporterId);
    
    try {
        const batch = writeBatch(db);
        
        const newReportRef = doc(reportsRef);
        batch.set(newReportRef, { ...reportData, timestamp: serverTimestamp() });
        
        batch.update(reportedUserRef, { reportCount: increment(1) });
        
        batch.update(reporterUserRef, { lastActionTimestamp: serverTimestamp() });
        
        await batch.commit();
        
        revalidatePath(`/admin/reports`);
        revalidatePath(`/admin/users`);
        
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting report:", error);
        return { success: false, error: "Rapor gönderilirken bir hata oluştu." };
    }
}

export async function hidePost(userId: string, postId: string) {
    if (!userId || !postId) return;

    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, {
            hiddenPostIds: arrayUnion(postId)
        });
        revalidatePath('/home');
    } catch (error) {
        console.error("Error hiding post:", error);
    }
}


export async function getSavedPosts(userId: string): Promise<Post[]> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const savedPostIds: string[] = userSnap.data().savedPosts || [];

    if (savedPostIds.length === 0) {
        return [];
    }

    const savedPosts: Post[] = [];
    for (let i = 0; i < savedPostIds.length; i += 30) {
        const batchIds = savedPostIds.slice(i, i + 30);
        if (batchIds.length === 0) continue;
        const postsQuery = query(collection(db, 'posts'), where('__name__', 'in', batchIds));
        const postsSnapshot = await getDocs(postsQuery);
        postsSnapshot.forEach(doc => {
            savedPosts.push({ id: doc.id, ...doc.data() } as Post);
        });
    }

    const sortedPosts = savedPosts.sort((a, b) => {
        return savedPostIds.indexOf(b.id) - savedPostIds.indexOf(a.id);
    });

    return deepSerialize(sortedPosts);
}

export async function updateUserLocation(uid: string, latitude: number, longitude: number) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        location: {
            latitude,
            longitude
        },
        lastSeen: serverTimestamp()
    });
}

export async function getNearbyUsers(currentUid: string, latitude: number, longitude: number, radiusKm: number = 20): Promise<any[]> {
    const latDegrees = radiusKm / 111.32; 
    const lonDegrees = radiusKm / (111.32 * Math.cos(latitude * (Math.PI / 180)));
    
    const lowerLat = latitude - latDegrees;
    const upperLat = latitude + latDegrees;
    const lowerLon = longitude - lonDegrees;
    const upperLon = longitude + lonDegrees;

    const usersRef = collection(db, 'users');
    const q = query(
        usersRef,
        where('location.latitude', '>=', lowerLat),
        where('location.latitude', '<=', upperLat),
    );
    const snapshot = await getDocs(q);

    const nearbyUsers: any[] = [];
    snapshot.forEach(doc => {
        const user = doc.data() as UserProfile & { location: { latitude: number; longitude: number } };
        if (
            user.uid !== currentUid &&
            user.location.longitude >= lowerLon &&
            user.location.longitude <= upperLon
        ) {
            nearbyUsers.push({
                uid: user.uid,
                username: user.username,
                photoURL: user.photoURL,
                position: [user.location.latitude, user.location.longitude],
            });
        }
    });

    return deepSerialize(nearbyUsers);
}


export async function deleteUserAccount(userId: string) {
    if (!userId) {
        throw new Error("Kullanıcı ID'si gerekli.");
    }
    const auth = getAuth();
    const userRef = doc(db, 'users', userId);

    try {
        // Delete user's avatar from Storage
        const avatarRef = ref(storage, `upload/avatars/${userId}/avatar.jpg`);
        await deleteObject(avatarRef).catch(error => {
            if (error.code !== 'storage/object-not-found') {
                console.error("Avatar silinirken hata:", error);
            }
        });
        
        // Delete user's posts and their images
        const postsQuery = query(collection(db, 'posts'), where('uid', '==', userId));
        const postsSnapshot = await getDocs(postsQuery);
        const deletePromises: Promise<any>[] = [];
        
        const batch = writeBatch(db);
        postsSnapshot.forEach(postDoc => {
            const postData = postDoc.data() as Post;
            if (postData.imageUrl) {
                const postImageRef = ref(storage, postData.imageUrl);
                deletePromises.push(deleteObject(postImageRef).catch(err => console.error(`Gönderi resmi silinemedi: ${postData.imageUrl}`, err)));
            }
            batch.delete(postDoc.ref);
        });
        await Promise.all(deletePromises);
        
        // Delete user's rooms (this is a more complex operation, assumes a utility function exists)
        const roomsQuery = query(collection(db, 'rooms'), where('createdBy.uid', '==', userId));
        const roomsSnapshot = await getDocs(roomsQuery);
        await Promise.all(roomsSnapshot.docs.map(roomDoc => deleteRoomWithSubcollections(roomDoc.id)));
        
        // Remove user from other users' followers/following lists
        // This is a very heavy operation and should be handled with care, possibly via a Cloud Function
        // For now, we will skip this to avoid performance issues in a server action.
        
        // Delete the user's main document
        batch.delete(userRef);
        
        // Commit all Firestore deletions
        await batch.commit();
        
        // Finally, delete the user from Firebase Authentication
        await auth.deleteUser(userId);

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error("Hesap silinirken hata:", error);
        return { success: false, error: "Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin." };
    }
}
