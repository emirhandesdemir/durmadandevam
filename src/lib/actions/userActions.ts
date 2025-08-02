// src/lib/actions/userActions.ts
'use server';

import { db, storage } from '@/lib/firebase';
import type { Post, Report, UserProfile } from '../types';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, limit, writeBatch, serverTimestamp, increment, arrayRemove, addDoc, collectionGroup, deleteDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, deleteObject, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import { deepSerialize } from '../server-utils';
import { revalidatePath } from 'next/cache';
import { getAuth } from '../firebaseAdmin';
import { deleteRoomWithSubcollections } from '../firestoreUtils';
import { updateUserPosts, updateUserComments, updateUserDmMessages } from './propagationActions';
import { findUserByUsername } from '../server-utils';
import { v4 as uuidv4 } from 'uuid';
import multiavatar from '@multiavatar/multiavatar';

// Helper function to convert SVG string to PNG Blob
const svgToPngBlob = (svgString: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, 128, 128);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Canvas to Blob conversion failed."));
                    }
                }, 'image/png');
            } else {
                reject(new Error("Canvas context could not be created."));
            }
        };

        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load SVG image for conversion."));
        };
        
        img.src = url;
    });
};

export async function updateUserProfile(updates: {
    userId: string;
    username?: string;
    bio?: string;
    age?: number | string | null;
    city?: string | null;
    country?: string | null;
    privateProfile?: boolean;
    acceptsFollowRequests?: boolean;
    showOnlineStatus?: boolean;
    animatedNav?: boolean;
    avatarId?: string; // Expect avatarId string
    selectedBubble?: string;
    selectedAvatarFrame?: string;
    interests?: string[];
    location?: { latitude: number; longitude: number; city?: string | null; country?: string | null; } | null
}) {
    const { userId, avatarId, ...otherUpdates } = updates;
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");

    const userRef = doc(db, 'users', userId);
    
    const batch = writeBatch(db);

    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("Kullanıcı bulunamadı.");
    const userData = userSnap.data();

    const updatesForDb: { [key: string]: any } = { ...otherUpdates };
    
    if (updates.age === '' || updates.age === undefined || updates.age === null) {
        updatesForDb.age = null;
    } else if (updates.age !== undefined) {
        updatesForDb.age = Number(updates.age);
    }
    
    // Check for username change and uniqueness
    if (updates.username && userData.username_lowercase !== updates.username.toLowerCase()) {
        const existingUser = await findUserByUsername(updates.username);
        // Throw error only if the username is taken by a DIFFERENT user
        if (existingUser && existingUser.uid !== userId) {
            throw new Error("Bu kullanıcı adı zaten başka birisi tarafından kullanılıyor.");
        }
        updatesForDb.username = updates.username;
        updatesForDb.username_lowercase = updates.username.toLowerCase();
    }
    
    // If an avatarId is provided, generate SVG, convert to PNG, and upload to Storage
    if (avatarId) {
        const svgString = multiavatar(avatarId);
        // This conversion part needs a browser environment, which is not available in a server action.
        // We'll simulate the blob creation. A better solution involves a proper image library on the server.
        const pngBlob = new Blob([svgString], { type: "image/svg+xml" }); // Simplified for now
        
        const pngPath = `avatars/${userId}/${uuidv4()}.png`;
        const pngStorageRef = storageRef(storage, pngPath);
        await uploadBytes(pngStorageRef, pngBlob, { contentType: 'image/svg+xml' });
        updatesForDb.photoURL = await getDownloadURL(pngStorageRef);
    }


    if (updates.location) {
        updatesForDb.location = {
            latitude: updates.location.latitude,
            longitude: updates.location.longitude,
        }
        // These will be updated from a separate reverse geocoding call if available
        if (updates.location.city) updatesForDb.city = updates.location.city;
        if (updates.location.country) updatesForDb.country = updates.location.country;
    }

    if (Object.keys(updatesForDb).length > 0) {
        batch.update(userRef, updatesForDb);
    }
    
    const authProfileUpdates: { displayName?: string; photoURL?: string } = {};
    if(updates.username && updates.username !== userData.username) {
      authProfileUpdates.displayName = updates.username;
    }
    if(updatesForDb.photoURL !== undefined && updatesForDb.photoURL !== userData.photoURL) {
      authProfileUpdates.photoURL = updatesForDb.photoURL;
    }

    if(Object.keys(authProfileUpdates).length > 0) {
      const auth = getAuth();
      await auth.updateUser(userId, authProfileUpdates);
    }

    await batch.commit();

    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updatesForDb.photoURL !== undefined) propagationUpdates.photoURL = updatesForDb.photoURL;
    if (updates.selectedAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;

    if (Object.keys(propagationUpdates).length > 0) {
         try {
            await Promise.all([
                updateUserPosts(userId, propagationUpdates),
                updateUserComments(userId, propagationUpdates),
                updateUserDmMessages(userId, propagationUpdates),
            ]);
        } catch(err) {
            console.error("Propagasyon hatası:", err);
            throw new Error("Profil güncellendi ancak eski içeriklere yansıtılamadı.");
        }
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
        where('username_lowercase', '>=', searchTermLower),
        where('username_lowercase', '<=', searchTermLower + '\uf8ff'),
        limit(10)
    );

    const snapshot = await getDocs(q);
    
    const users = snapshot.docs
        .map(doc => {
            const data = doc.data();
            // Exclude sensitive fields like email
            const { email, fcmTokens, ...safeData } = data;
            return { ...safeData, uid: doc.id } as UserProfile;
        })
        .filter(user => user.uid !== currentUserId);

    return deepSerialize(users);
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
        
        // Rate limiting: Update last action timestamp
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
    await setDoc(userRef, {
        location: {
            latitude,
            longitude
        },
        city: 'Bilinmeyen Şehir', // Placeholder until we have reverse geocoding
        country: 'TR', // Placeholder
        lastSeen: serverTimestamp()
    }, { merge: true });
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
                bio: user.bio,
                age: user.age,
                city: user.city,
                selectedAvatarFrame: user.selectedAvatarFrame,
                position: [user.location.latitude, user.location.longitude],
            });
        }
    });

    return deepSerialize(nearbyUsers);
}

export async function deleteUserAccount(userId: string) {
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");
    
    const batch = writeBatch(db);
    
    // 1. Delete user's posts and their associated images/videos
    const postsQuery = query(collection(db, "posts"), where("uid", "==", userId));
    const postsSnapshot = await getDocs(postsQuery);
    postsSnapshot.forEach((postDoc) => {
        const postData = postDoc.data();
        if (postData.imageUrl) {
             const imageRef = storageRef(storage, postData.imageUrl);
             deleteObject(imageRef).catch(e => console.error("Post image deletion error:", e));
        }
         if (postData.videoUrl) {
             const videoRef = storageRef(storage, postData.videoUrl);
             deleteObject(videoRef).catch(e => console.error("Post video deletion error:", e));
        }
        batch.delete(postDoc.ref);
    });
    
    // 2. Delete user's comments
    const commentsQuery = query(collectionGroup(db, "comments"), where("uid", "==", userId));
    const commentsSnapshot = await getDocs(commentsQuery);
    commentsSnapshot.forEach((doc) => batch.delete(doc.ref));
    
    // 3. Delete user's rooms
    const roomsQuery = query(collection(db, 'rooms'), where('createdBy.uid', '==', userId));
    const roomsSnapshot = await getDocs(roomsQuery);
    const roomDeletePromises = roomsSnapshot.docs.map(roomDoc => deleteRoomWithSubcollections(roomDoc.id));
    await Promise.all(roomDeletePromises);
    
    // 4. Remove user from followers/following lists of other users (more complex, consider a Cloud Function for this)
    // For now, we will skip this step to avoid very large reads/writes.
    
    // 5. Delete user's main document and avatar
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().photoURL) {
        // Avatars are data URIs, so no Storage deletion is needed.
    }
    batch.delete(userRef);

    try {
        await batch.commit();

        // 6. Delete user from Firebase Auth
        const auth = getAuth();
        await auth.deleteUser(userId);
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user account:", error);
        return { success: false, error: "Hesap silinirken bir hata oluştu." };
    }
}


export async function blockUser(blockerId: string, targetId: string) {
    if (!blockerId || !targetId) throw new Error("Gerekli kullanıcı bilgileri eksik.");
    if (blockerId === targetId) throw new Error("Kendinizi engelleyemezsiniz.");

    const blockerRef = doc(db, 'users', blockerId);
    const targetRef = doc(db, 'users', targetId);

    try {
        const batch = writeBatch(db);
        
        // Add target to blocker's list
        batch.update(blockerRef, { 
            blockedUsers: arrayUnion(targetId),
            lastActionTimestamp: serverTimestamp()
        });
        
        // Force unfollow both ways
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
