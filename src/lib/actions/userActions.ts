'use server';

import { db, storage } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, limit, writeBatch } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { deepSerialize } from '../server-utils';
import { followUser } from './followActions';

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

interface UpdateOnboardingDataArgs {
    userId: string;
    avatarDataUrl: string | null;
    bio: string;
    followingUids: string[];
}

export async function updateOnboardingData({ userId, avatarDataUrl, bio, followingUids }: UpdateOnboardingDataArgs) {
    if (!userId) throw new Error("Kullanıcı ID'si bulunamadı.");
    
    const userDocRef = doc(db, 'users', userId);
    const updates: { [key: string]: any } = {};

    if (avatarDataUrl) {
        const newAvatarRef = ref(storage, `upload/avatars/${userId}`);
        const snapshot = await uploadString(newAvatarRef, avatarDataUrl, 'data_url');
        updates.photoURL = await getDownloadURL(snapshot.ref);
    }
    
    if (bio.trim()) {
        updates.bio = bio.trim();
    }
    
    if (Object.keys(updates).length > 0) {
        await updateDoc(userDocRef, updates);
    }

    if (followingUids.length > 0) {
        const userSnap = await getDoc(userDocRef);
        const currentUserData = userSnap.data();
        
        if (currentUserData) {
            for (const targetUserId of followingUids) {
                 followUser(userId, targetUserId, {
                    username: currentUserData.username,
                    photoURL: updates.photoURL || currentUserData.photoURL || null,
                    userAvatarFrame: currentUserData.selectedAvatarFrame || ''
                }).catch(e => console.error(`Failed to follow ${targetUserId}:`, e));
            }
        }
    }
}
