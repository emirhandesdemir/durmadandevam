// src/lib/actions/userActions.ts
'use server';

import { db, storage } from '@/lib/firebase';
import type { Post, Report, UserProfile } from '../types';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, limit, writeBatch, serverTimestamp, increment, arrayRemove, addDoc, collectionGroup, deleteDoc, setDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { ref as storageRef, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import { deepSerialize } from '../server-utils';
import { revalidatePath } from 'next/cache';
import { getAuth } from '../firebaseAdmin';
import { deleteRoomWithSubcollections } from '../firestoreUtils';
import { updateUserPosts, updateUserComments, updateUserDmMessages } from './propagationActions';
import { logTransaction } from './transactionActions';
import { verifyPasswordResetCode, confirmPasswordReset, verifyBeforeUpdateEmail } from 'firebase/auth';


export async function sendPasswordResetLink(email: string) {
    if (!email) {
        return { success: false, error: 'E-posta adresi gereklidir.' };
    }
    try {
        const auth = getAuth();
        await auth.generatePasswordResetLink(email);
        return { success: true };
    } catch (error: any) {
        console.error("Şifre sıfırlama linki oluşturulurken hata:", error);
         if (error.code === 'auth/user-not-found') {
            return { success: false, error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.' };
        }
        return { success: false, error: 'Şifre sıfırlama e-postası gönderilirken bir hata oluştu.' };
    }
}


export async function resetPasswordWithCode(code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!code || !newPassword) {
        return { success: false, error: 'Kod ve yeni şifre gereklidir.' };
    }
    try {
        const auth = getAuth();
        const email = await auth.verifyPasswordResetCode(code);
        await auth.confirmPasswordReset(code, newPassword);
        return { success: true };
    } catch (error: any) {
        console.error("Şifre sıfırlama hatası (sunucu):", error);
        if (error.code === 'auth/expired-action-code') {
            return { success: false, error: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni bir tane isteyin.' };
        }
        if (error.code === 'auth/invalid-action-code') {
            return { success: false, error: 'Doğrulama kodu geçersiz. Lütfen doğru girdiğinizden emin olun.' };
        }
        if (error.code === 'auth/user-disabled') {
            return { success: false, error: 'Bu kullanıcı hesabı askıya alınmıştır.' };
        }
         if (error.code === 'auth/user-not-found') {
            return { success: false, error: 'Bu kodla ilişkili kullanıcı bulunamadı.' };
        }
        return { success: false, error: 'Şifre sıfırlanırken bilinmeyen bir hata oluştu.' };
    }
}


export async function assignMissingUniqueTag(userId: string) {
    if (!userId) throw new Error("User ID is required.");

    const userRef = doc(db, 'users', userId);
    const counterRef = doc(db, 'config', 'counters');

    return runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || userDoc.data()?.uniqueTag) {
            return { success: true, message: 'No action needed.' };
        }
        
        let currentTag = 1000;
        try {
            const counterDoc = await transaction.get(counterRef);
            if (counterDoc.exists()) {
                currentTag = counterDoc.data().userTag || 1000;
            }
        } catch (e) {
            console.warn("Counter document not found, will create it.");
        }
        
        const newTag = currentTag + 1;
        
        transaction.set(counterRef, { userTag: newTag }, { merge: true });
        transaction.update(userRef, { uniqueTag: newTag });
        
        console.log(`Assigned uniqueTag ${newTag} to user ${userId}`);
        return { success: true, newTag };
    });
}


export async function sendVerificationEmail(userId: string) {
    if (!userId) {
        return { success: false, error: 'Kullanıcı ID\'si gereklidir.' };
    }
    try {
        const auth = getAuth();
        const userRecord = await auth.getUser(userId);
        if (userRecord.emailVerified) {
            return { success: false, error: 'Bu e-posta adresi zaten doğrulanmış.' };
        }
        if (!userRecord.email) {
            return { success: false, error: 'Kullanıcının kayıtlı bir e-posta adresi yok.' };
        }
        // This generates the link and triggers Firebase's built-in email sender
        // if the email templates are configured properly.
        await auth.generateEmailVerificationLink(userRecord.email);
        return { success: true };
    } catch (error: any) {
        console.error("Doğrulama e-postası gönderilirken hata:", error);
        return { success: false, error: 'E-posta gönderilirken bir hata oluştu.' };
    }
}

export async function updateUserProfile(updates: {
    userId: string;
    isNewUser?: boolean;
    email?: string | null;
    referredBy?: string | null;
    photoURL?: string | null;
    username?: string;
    bio?: string;
    age?: number | string | null;
    city?: string | null;
    country?: string | null;
    privateProfile?: boolean;
    acceptsFollowRequests?: boolean;
    showOnlineStatus?: boolean;
    animatedNav?: boolean;
    selectedBubble?: string;
    selectedAvatarFrame?: string;
    interests?: string[];
    location?: { latitude: number; longitude: number; city?: string | null; country?: string | null; } | null;
    profileCompletionAwarded?: boolean;
    sessionInfo?: { lastSeen: any, ipAddress?: string, userAgent?: string };
}) {
    const { userId, isNewUser, sessionInfo, ...otherUpdates } = updates;
    if (!userId) throw new Error("Kullanıcı ID'si gerekli.");

    const userRef = doc(db, 'users', userId);
    
    const { photoURL, username, ...restOfUpdates } = otherUpdates;
    const updatesForDb: { [key: string]: any } = { ...restOfUpdates };
    
    if (photoURL !== undefined) updatesForDb.photoURL = photoURL;
    if (username !== undefined) {
        updatesForDb.username = username;
        updatesForDb.username_lowercase = username.toLowerCase();
    }
    if (sessionInfo) {
        updatesForDb[`sessions.current`] = sessionInfo;
    }


    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
            if (isNewUser) {
                const counterRef = doc(db, 'config', 'counters');
                let newTag = 1000;
                
                try {
                    const counterDoc = await transaction.get(counterRef);
                    if (counterDoc.exists()) {
                        newTag = (counterDoc.data().userTag || 1000) + 1;
                    }
                } catch(e) {
                }
                
                transaction.set(counterRef, { userTag: newTag }, { merge: true });
                
                const initialData: UserProfile = {
                    uid: userId,
                    uniqueTag: newTag, 
                    email: updates.email!,
                    emailVerified: false,
                    username: updates.username!,
                    username_lowercase: updates.username?.toLowerCase(), 
                    photoURL: updates.photoURL || null, 
                    bio: null,
                    age: null,
                    city: null,
                    country: null,
                    gender: undefined,
                    interests: [],
                    role: 'user',
                    createdAt: serverTimestamp() as any,
                    lastActionTimestamp: serverTimestamp() as any,
                    diamonds: 50,
                    profileValue: 0,
                    giftLevel: 0,
                    totalDiamondsSent: 0,
                    referredBy: updates.referredBy || null,
                    referralCount: 0,
                    postCount: 0,
                    followers: [],
                    following: [],
                    blockedUsers: [],
                    savedPosts: [],
                    followRequests: [],
                    hiddenPostIds: [],
                    privateProfile: false,
                    acceptsFollowRequests: true,
                    showOnlineStatus: true,
                    animatedNav: true,
                    selectedBubble: '',
                    selectedAvatarFrame: '',
                    isBanned: false,
                    profileEmoji: null,
                    reportCount: 0,
                    isOnline: true,
                    lastSeen: serverTimestamp() as any,
                    premiumUntil: null,
                    isFirstPremium: false,
                    unlimitedRoomCreationUntil: null,
                    profileCompletionNotificationSent: false,
                    profileCompletionAwarded: false,
                    location: null,
                    sessions: sessionInfo ? { current: sessionInfo } : {},
                 };
                transaction.set(userRef, initialData);
            } else {
                 throw new Error("Kullanıcı profili güncellenemedi çünkü henüz mevcut değil.");
            }
        } else {
            if (updatesForDb.age === '' || updatesForDb.age === undefined || updatesForDb.age === null) {
                updatesForDb.age = null;
            } else if (updatesForDb.age !== undefined) {
                updatesForDb.age = Number(updatesForDb.age);
            }
             if (updatesForDb.username) {
                updatesForDb.username_lowercase = updatesForDb.username.toLowerCase();
            }

            if (Object.keys(updatesForDb).length > 0) {
                 transaction.update(userRef, updatesForDb);
            }
        }
    });

    const propagationUpdates: { [key: string]: any } = {};
    if (username) propagationUpdates.username = username;
    if (photoURL !== undefined) propagationUpdates.userPhotoURL = photoURL;
    if (updates.selectedAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;

    if (Object.keys(propagationUpdates).length > 0) {
        try {
            await Promise.all([
                updateUserPosts(userId, propagationUpdates),
                updateUserComments(userId, propagationUpdates),
                updateUserDmMessages(userId, propagationUpdates),
            ]);
        } catch(err) {
            console.error("Propagation error:", err);
        }
    }

    if (photoURL || username) {
      try {
        const auth = getAuth();
        const authUpdates: { photoURL?: string; displayName?: string } = {};
        if (photoURL) authUpdates.photoURL = photoURL;
        if (username) authUpdates.displayName = username;
        if (Object.keys(authUpdates).length > 0) {
            await auth.updateUser(userId, authUpdates);
        }
      } catch (e) {
        console.error("Auth profile update failed:", e);
      }
    }

    revalidatePath(`/profile/${userId}`, 'layout');
    return { success: true };
}


export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
    if (!searchTerm.trim()) return [];

    const usersRef = collection(db, 'users');
    const promises: Promise<any>[] = [];

    const numericSearchTerm = searchTerm.startsWith('@') ? parseInt(searchTerm.substring(1), 10) : parseInt(searchTerm, 10);
    if (!isNaN(numericSearchTerm)) {
        const qTag = query(usersRef, where('uniqueTag', '==', numericSearchTerm), limit(5));
        promises.push(getDocs(qTag));
    }

    const searchTermLower = searchTerm.toLowerCase();
    const qName = query(
        usersRef,
        where('username_lowercase', '>=', searchTermLower),
        where('username_lowercase', '<=', searchTermLower + '\uf8ff'),
        limit(10)
    );
    promises.push(getDocs(qName));

    const snapshots = await Promise.all(promises);
    const userMap = new Map<string, UserProfile>();

    snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
            if (!userMap.has(doc.id)) {
                const data = doc.data();
                const { email, fcmTokens, ...safeData } = data;
                if (data.uid !== currentUserId) {
                    userMap.set(doc.id, { ...safeData, uid: doc.id } as UserProfile);
                }
            }
        });
    });

    const users = Array.from(userMap.values());
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

export async function unhidePost(userId: string, postId: string) {
    if (!userId || !postId) return;
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, {
            hiddenPostIds: arrayRemove(postId)
        });
        revalidatePath('/home');
    } catch (error) {
        console.error("Error unhiding post:", error);
    }
}


export async function getSavedPosts(userId: string): Promise<Post[]> {
    if (!userId) {
        return [];
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    const savedPostIds: string[] = userSnap.data().savedPosts || [];

    if (!Array.isArray(savedPostIds) || savedPostIds.length === 0) {
        return [];
    }
    
    const savedPosts: Post[] = [];
    for (let i = 0; i < savedPostIds.length; i += 30) {
        const batchIds = savedPostIds.slice(i, i + 30);
        if (batchIds.length > 0) {
            const postsQuery = query(collection(db, 'posts'), where('__name__', 'in', batchIds));
            const postsSnapshot = await getDocs(postsQuery);
            postsSnapshot.forEach(doc => {
                savedPosts.push({ id: doc.id, ...doc.data() } as Post);
            });
        }
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
        city: 'Bilinmeyen Şehir',
        country: 'TR',
        lastSeen: serverTimestamp()
    }, { merge: true });
}

export async function getNearbyUsers(currentUid: string, latitude: number, longitude: number, radiusKm: number = 20): Promise<any[]> {
    const latDegrees = radiusKm / 111.32; 
    const lonDegrees = radiusKm / (111.32 * Math.cos(latitude * (latitude * (Math.PI / 180))));
    
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
    
    const commentsQuery = query(collectionGroup(db, "comments"), where("uid", "==", userId));
    const commentsSnapshot = await getDocs(commentsQuery);
    commentsSnapshot.forEach((doc) => batch.delete(doc.ref));
    
    const roomsQuery = query(collection(db, 'rooms'), where('createdBy.uid', '==', userId));
    const roomsSnapshot = await getDocs(roomsQuery);
    const roomDeletePromises = roomsSnapshot.docs.map(roomDoc => deleteRoomWithSubcollections(roomDoc.id));
    await Promise.all(roomDeletePromises);
    
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().photoURL) {
        try {
            if (userSnap.data().photoURL.includes('firebasestorage')) {
               const avatarRef = storageRef(storage, `avatars/${userId}/profile.png`);
               await deleteObject(avatarRef);
            }
        } catch (e) {
            if ((e as any).code !== 'storage/object-not-found') {
                 console.error("Avatar deletion error:", e);
            }
        }
    }
    batch.delete(userRef);

    try {
        await batch.commit();

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

export async function changeUserPassword(userId: string, currentPasswordPlainText: string, newPasswordPlainText: string) {
     throw new Error("Password change must be initiated from the client with reauthentication.");
}

export async function revokeAllSessions(userId: string) {
    if (!userId) {
        throw new Error("Kullanıcı ID'si gerekli.");
    }
    try {
        const auth = getAuth();
        await auth.revokeRefreshTokens(userId);
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().sessions?.current) {
            const currentSession = userDoc.data().sessions.current;
            await updateDoc(userRef, {
                sessions: {
                    current: currentSession
                }
            });
        }
        return { success: true };
    } catch (error: any) {
        console.error("Oturumlar sonlandırılırken hata:", error);
        return { success: false, error: "Oturumlar sonlandırılamadı." };
    }
}

export async function changeUniqueTag(userId: string, newTag: number) {
    if (!userId || !newTag) throw new Error("Gerekli parametreler eksik.");
    
    const userRef = doc(db, 'users', userId);
    const cost = 1000;

    return await runTransaction(db, async (transaction) => {
        const tagQuery = query(collection(db, 'users'), where('uniqueTag', '==', newTag), limit(1));
        const tagSnapshot = await transaction.get(tagQuery);
        if (!tagSnapshot.empty) {
            throw new Error(`@${newTag} ID'si zaten kullanımda.`);
        }
        
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı.");
        const userData = userDoc.data();
        
        if ((userData.diamonds || 0) < cost) {
            throw new Error(`Kullanıcı ID'nizi değiştirmek için ${cost} elmas gereklidir.`);
        }

        transaction.update(userRef, { 
            diamonds: increment(-cost),
            uniqueTag: newTag
        });

        await logTransaction(transaction, userId, {
            type: 'user_perk',
            amount: -cost,
            description: `Kullanıcı ID'sini @${newTag} olarak değiştirme`,
        });

        revalidatePath(`/profile/${userId}`);
        revalidatePath(`/profile/${newTag}`);
        return { success: true };
    });
}
