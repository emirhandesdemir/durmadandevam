// src/lib/actions/userActions.ts
'use server';

import { db, storage } from '@/lib/firebase';
import type { Report, UserProfile, Post, Comment } from '../types';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, limit, writeBatch, serverTimestamp, increment, arrayRemove, addDoc, orderBy, setDoc, collectionGroup, deleteField } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { deepSerialize } from '../server-utils';
import { revalidatePath } from 'next/cache';
import { getAuth } from '../firebaseAdmin';
import { deleteRoomWithSubcollections } from '../firestoreUtils';

async function processQueryInBatches(transaction: WriteBatch, queryToProcess: any, updateData: any) {
    const snapshot = await getDocs(queryToProcess);
    if (snapshot.empty) return;

    snapshot.docs.forEach((doc) => {
        transaction.update(doc.ref, updateData);
    });
}

async function updateUserPosts(transaction: WriteBatch, uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;
    
    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.selectedAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;
    if (updates.profileEmoji !== undefined) propagationUpdates.profileEmoji = updates.profileEmoji;
    
    if (Object.keys(propagationUpdates).length === 0) return;

    const userPostsQuery = query(collection(db, 'posts'), where('uid', '==', uid));
    await processQueryInBatches(transaction, userPostsQuery, propagationUpdates);
}

async function updateUserComments(transaction: WriteBatch, uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;

    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.selectedAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;
    if (updates.profileEmoji !== undefined) propagationUpdates.profileEmoji = updates.profileEmoji;
    
    if (Object.keys(propagationUpdates).length === 0) return;

    const commentsQuery = query(collectionGroup(db, 'comments'), where('uid', '==', uid));
    await processQueryInBatches(transaction, commentsQuery, propagationUpdates);
}


export async function findUserByUsername(username: string): Promise<UserProfile | null> {
    if (!username) return null;
    const usersRef = collection(db, 'users');
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
    
    const batch = writeBatch(db);

    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("Kullanıcı bulunamadı.");
    const userData = userSnap.data();

    const updatesForDb: { [key: string]: any } = { ...otherUpdates };
    
    if (updates.age === '' || updates.age === undefined || updates.age === null) {
        updatesForDb.age = deleteField();
    } else if (updates.age !== undefined) {
        updatesForDb.age = Number(updates.age);
    }
    
    if (updates.username && userData.username !== updates.username) {
        const newUsernameLower = updates.username.toLowerCase();
        const existingUserQuery = query(collection(db, 'users'), where('username_lowercase', '==', newUsernameLower), limit(1));
        const existingUserSnapshot = await getDocs(existingUserQuery);
        if (!existingUserSnapshot.empty && existingUserSnapshot.docs[0].id !== userId) {
             throw new Error("Bu kullanıcı adı zaten başka birisi tarafından kullanılıyor.");
        }
        updatesForDb.username = updates.username;
        updatesForDb.username_lowercase = newUsernameLower;
    }

    if (Object.keys(updatesForDb).length > 0) {
        batch.update(userRef, updatesForDb);
    }
    
    await batch.commit();

    // Propagate changes separately as they can be long-running
    const propagationBatch = writeBatch(db);
    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.selectedAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;
    if (updates.profileEmoji !== undefined) propagationUpdates.profileEmoji = updates.profileEmoji;

    if (Object.keys(propagationUpdates).length > 0) {
         await Promise.all([
            updateUserPosts(propagationBatch, userId, propagationUpdates),
            updateUserComments(propagationBatch, userId, propagationUpdates),
        ]).catch(err => {
            console.error("Propagasyon hatası:", err);
        });
        await propagationBatch.commit();
    }

    const auth = getAuth();
    const authUpdates: { displayName?: string, photoURL?: string | null } = {};
    if (updates.username) authUpdates.displayName = updates.username;
    if (updates.photoURL !== undefined) authUpdates.photoURL = updates.photoURL;

    if (Object.keys(authUpdates).length > 0) {
        await auth.updateUser(userId, authUpdates);
    }
    

    revalidatePath(`/profile/${userId}`, 'layout');
    return { success: true };
}


export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
    if (!searchTerm.trim()) return [];

    const usersRef = collection(db, 'users');
    const searchTermLower = searchTerm.toLowerCase();
    const q = query(
        usersRef,
        orderBy('username_lowercase'),
        where('username_lowercase', '>=', searchTermLower),
        where('username_lowercase', '<=', searchTermLower + '\uf8ff'),
        limit(10)
    );

    const snapshot = await getDocs(q);
    
    const users = snapshot.docs
        .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
        .filter(user => user.uid !== currentUserId);

    return deepSerialize(users);
}


export async function saveFCMToken(userId: string, token: string) {
  if (!userId || !token) {
    throw new Error('Kullanıcı ID ve jeton gereklidir.');
  }
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(userRef, {
      fcmTokens: arrayUnion(token),
    }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('FCM jetonu kaydedilirken hata:', error);
    return { success: false, error: error.message };
  }
}

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
