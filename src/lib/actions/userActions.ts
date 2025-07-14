// src/lib/actions/userActions.ts
'use server';

import { db, storage } from '@/lib/firebase';
import type { Report, UserProfile, Post, Comment } from '../types';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, limit, writeBatch, serverTimestamp, increment, arrayRemove, addDoc, orderBy, setDoc, collectionGroup, deleteField } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { deepSerialize } from '../server-utils';
import { revalidatePath } from 'next/cache';
import { emojiToDataUrl } from '../utils';

// Helper function to process queries in batches to avoid Firestore limits
async function processQueryInBatches(query: any, updateData: any) {
    const snapshot = await getDocs(query);
    if (snapshot.empty) return;

    const batchSize = 499;
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    snapshot.docs.forEach((doc) => {
        currentBatch.update(doc.ref, updateData);
        operationCount++;
        if (operationCount === batchSize) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            operationCount = 0;
        }
    });

    if (operationCount > 0) {
        batches.push(currentBatch.commit());
    }

    await Promise.all(batches);
}

export async function updateUserPosts(uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) {
        return;
    }

    const postsRef = collection(db, 'posts');
    const writePromises = [];

    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.profileEmoji) propagationUpdates.profileEmoji = updates.profileEmoji;
    if (updates.userAvatarFrame) propagationUpdates.userAvatarFrame = updates.userAvatarFrame;
    
    if (Object.keys(propagationUpdates).length === 0) return;

    // Update user's own posts (original posts and retweets by them)
    const userPostsQuery = query(postsRef, where('uid', '==', uid));
    writePromises.push(processQueryInBatches(userPostsQuery, propagationUpdates));

    // Update user's appearance in others' retweets of their posts
    const retweetUpdates: { [key: string]: any } = {};
    if (updates.username) retweetUpdates['retweetOf.username'] = updates.username;
    if (updates.photoURL) retweetUpdates['retweetOf.photoURL'] = updates.photoURL;
    if (updates.profileEmoji) retweetUpdates['retweetOf.profileEmoji'] = updates.profileEmoji;
    if (updates.userAvatarFrame) retweetUpdates['retweetOf.userAvatarFrame'] = updates.userAvatarFrame;
    
    if (Object.keys(retweetUpdates).length > 0) {
        const retweetsQuery = query(postsRef, where('retweetOf.uid', '==', uid));
        writePromises.push(processQueryInBatches(retweetsQuery, retweetUpdates));
    }

    try {
        await Promise.all(writePromises);
        revalidatePath('/home');
        revalidatePath(`/profile/${uid}`);
    } catch (error) {
        console.error("Kullanıcı gönderileri güncellenirken hata:", error);
        throw error;
    }
}

export async function updateUserComments(uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) {
        return;
    }

    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.profileEmoji) propagationUpdates.profileEmoji = updates.profileEmoji;
    if (updates.userAvatarFrame) propagationUpdates.userAvatarFrame = updates.userAvatarFrame;
    
    if (Object.keys(propagationUpdates).length === 0) return;


    const commentsQuery = query(collectionGroup(db, 'comments'), where('uid', '==', uid));

    try {
        await processQueryInBatches(commentsQuery, propagationUpdates);
    } catch (error) {
        console.error("Kullanıcı yorumları güncellenirken hata:", error);
        throw error;
    }
}


export async function findUserByUsername(username: string): Promise<UserProfile | null> {
    if (!username) return null;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username), limit(1));
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
    profileEmoji?: string | null;
    selectedBubble?: string;
    selectedAvatarFrame?: string;
    interests?: string[];
}) {
    const { userId, ...otherUpdates } = updates;
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");

    const userRef = doc(db, 'users', userId);
    const updatesForDb: { [key: string]: any } = { ...otherUpdates };
    
    // Convert age to number or remove if empty
    if (updates.age === '' || updates.age === undefined) {
        updatesForDb.age = deleteField();
    } else {
        updatesForDb.age = Number(updates.age);
    }
    
    // Generate new photoURL from emoji if changed
    if (updates.profileEmoji) {
        updatesForDb.photoURL = emojiToDataUrl(updates.profileEmoji);
    }


    // Validate username if it's being changed
    if (updates.username) {
        const currentUserDoc = await getDoc(userRef);
        if (currentUserDoc.exists() && currentUserDoc.data().username !== updates.username) {
            const existingUser = await findUserByUsername(updates.username);
            if (existingUser && existingUser.uid !== userId) {
                throw new Error("Bu kullanıcı adı zaten başka birisi tarafından kullanılıyor.");
            }
        }
    }

    // Update the main user document
    await updateDoc(userRef, updatesForDb);

    // Prepare updates to propagate to other collections
    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updatesForDb.photoURL) propagationUpdates.photoURL = updatesForDb.photoURL; // Use the newly generated URL
    if (updates.profileEmoji) propagationUpdates.profileEmoji = updates.profileEmoji;
    if (updates.selectedAvatarFrame) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;
    
    // Propagate changes if necessary
    if (Object.keys(propagationUpdates).length > 0) {
        await Promise.all([
            updateUserPosts(userId, propagationUpdates),
            updateUserComments(userId, propagationUpdates)
        ]);
    }
    
    revalidatePath(`/profile/${userId}`, 'page');
    revalidatePath(`/home`, 'layout');

    return { success: true };
}


export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
    if (!searchTerm.trim()) return [];

    const usersRef = collection(db, 'users');
    const q = query(
        usersRef,
        orderBy('username'),
        where('username', '>=', searchTerm),
        where('username', '<=', searchTerm + '\uf8ff'),
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


export async function getSuggestedUsers(currentUserId: string): Promise<UserProfile[]> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '!=', currentUserId), limit(10));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        return [];
    }
    
    const users = snapshot.docs.map(doc => doc.data() as UserProfile);
    return deepSerialize(users);
}

export async function getFollowingForSuggestions(userId: string): Promise<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]> {
    if (!userId) return [];

    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
        return [];
    }

    const userData = userSnap.data();
    const followingIds: string[] = userData.following || [];

    if (followingIds.length === 0) {
        return [];
    }

    const suggestions: Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[] = [];
    for (let i = 0; i < followingIds.length; i += 30) {
        const batchIds = followingIds.slice(i, i + 30);
        if(batchIds.length === 0) continue;
        const q = query(collection(db, 'users'), where('uid', 'in', batchIds));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            const { uid, username, photoURL } = doc.data() as UserProfile;
            suggestions.push({ uid, username, photoURL: photoURL || null });
        });
    }

    return deepSerialize(suggestions);
}

export async function blockUser(blockerId: string, targetId: string) {
    if (!blockerId || !targetId) throw new Error("Gerekli kullanıcı bilgileri eksik.");
    if (blockerId === targetId) throw new Error("Kendinizi engelleyemezsiniz.");

    const blockerRef = doc(db, 'users', blockerId);
    const targetRef = doc(db, 'users', targetId);

    try {
        const batch = writeBatch(db);
        
        batch.update(blockerRef, { 
            blockedUsers: arrayUnion(targetId),
            lastActionTimestamp: serverTimestamp()
        });
        
        batch.update(blockerRef, { following: arrayRemove(targetId) });
        batch.update(targetRef, { followers: arrayRemove(blockerId) });
        batch.update(targetRef, { following: arrayRemove(blockerId) });
        batch.update(blockerRef, { followers: arrayRemove(targetId) });

        await batch.commit();

        revalidatePath(`/profile/${targetId}`);
        revalidatePath(`/home`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Kullanıcı engellenemedi: " + error.message };
    }
}

export async function unblockUser(blockerId: string, targetId: string) {
    if (!blockerId || !targetId) throw new Error("Gerekli kullanıcı bilgileri eksik.");

    const blockerRef = doc(db, 'users', blockerId);

    try {
        await updateDoc(blockerRef, {
            blockedUsers: arrayRemove(targetId),
            lastActionTimestamp: serverTimestamp()
        });
        revalidatePath(`/profile/${targetId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Engelleme kaldırılamadı: " + error.message };
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
