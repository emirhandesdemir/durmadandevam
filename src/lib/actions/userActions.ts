// src/lib/actions/userActions.ts
'use server';

import { db, storage } from '@/lib/firebase';
import type { Report, UserProfile } from '@/lib/types';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, limit, writeBatch, serverTimestamp, increment, arrayRemove, addDoc, orderBy } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { deepSerialize } from '../server-utils';
import { revalidatePath } from 'next/cache';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        return deepSerialize(userData) as UserProfile;
    }
    return null;
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

export async function saveFCMToken(userId: string, token: string) {
  if (!userId || !token) {
    throw new Error('Kullanıcı ID ve jeton gereklidir.');
  }
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
    });
    return { success: true };
  } catch (error: any) {
    console.error('FCM jetonu kaydedilirken hata:', error);
    return { success: false, error: error.message };
  }
}

export async function updateOnboardingData({ userId, avatarDataUrl, bio, followingUids }: {
    userId: string,
    avatarDataUrl: string | null,
    bio: string,
    followingUids: string[]
}) {
    const userRef = doc(db, 'users', userId);
    const batch = writeBatch(db);

    let photoURL = null;
    if (avatarDataUrl) {
        const avatarRef = ref(storage, `upload/avatars/${userId}/avatar.jpg`);
        await uploadString(avatarRef, avatarDataUrl, 'data_url');
        photoURL = await getDownloadURL(avatarRef);
    }

    const updates: any = { bio };
    if (photoURL) {
        updates.photoURL = photoURL;
    }
    
    batch.update(userRef, updates);

    // Takip etme işlemleri
    if (followingUids.length > 0) {
        batch.update(userRef, { following: arrayUnion(...followingUids) });
        for (const targetId of followingUids) {
            const targetRef = doc(db, 'users', targetId);
            batch.update(targetRef, { followers: arrayUnion(userId) });
        }
    }

    await batch.commit();
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
    // Firestore 'in' query can take up to 30 elements
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

// Block and Report Actions
export async function blockUser(blockerId: string, targetId: string) {
    if (!blockerId || !targetId) throw new Error("Gerekli kullanıcı bilgileri eksik.");
    if (blockerId === targetId) throw new Error("Kendinizi engelleyemezsiniz.");

    const blockerRef = doc(db, 'users', blockerId);

    try {
        await updateDoc(blockerRef, {
            blockedUsers: arrayUnion(targetId)
        });
        revalidatePath(`/profile/${targetId}`);
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
            blockedUsers: arrayRemove(targetId)
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
        
        // Add new report document
        const newReportRef = doc(reportsRef);
        batch.set(newReportRef, { ...reportData, timestamp: serverTimestamp() });
        
        // Increment report count on user's profile
        batch.update(reportedUserRef, { reportCount: increment(1) });
        
        // Update reporter's last action timestamp for rate limiting
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


export async function getExploreProfiles(currentUserId: string): Promise<UserProfile[]> {
  try {
    // 1. Find all posts with an image
    const postsWithImagesQuery = query(
      collection(db, "posts"),
      where("imageUrl", "!=", ""),
      orderBy("imageUrl"), // Firestore requires an orderBy when using a not-equals filter
      orderBy("createdAt", "desc"),
      limit(100) // Get the latest 100 posts with images as a pool
    );
    const postsSnapshot = await getDocs(postsWithImagesQuery);

    if (postsSnapshot.empty) {
      return [];
    }

    // 2. Get unique user IDs from these posts, excluding the current user
    const userIdsWithPhotos = new Set<string>();
    postsSnapshot.forEach(doc => {
      const post = doc.data();
      if (post.uid !== currentUserId) {
        userIdsWithPhotos.add(post.uid);
      }
    });

    const uniqueUserIds = Array.from(userIdsWithPhotos);

    if (uniqueUserIds.length === 0) {
      return [];
    }

    // 3. Shuffle the array to make the feed feel different on each load
    for (let i = uniqueUserIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueUserIds[i], uniqueUserIds[j]] = [uniqueUserIds[j], uniqueUserIds[i]];
    }

    // 4. Fetch the full user profiles for a batch of these users
    // Firestore's 'in' query is limited to 30 items
    const userIdsToFetch = uniqueUserIds.slice(0, 30);
    
    const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIdsToFetch));
    const usersSnapshot = await getDocs(usersQuery);

    const profiles = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

    // 5. Serialize the data to make it safe for client components
    return deepSerialize(profiles);
  } catch (error) {
    console.error("Error fetching explore profiles:", error);
    return []; // Return an empty array on error
  }
}
