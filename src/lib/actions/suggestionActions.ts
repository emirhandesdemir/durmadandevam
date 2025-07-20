// src/lib/actions/suggestionActions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { UserProfile } from '../types';
import { deepSerialize } from '../server-utils';

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
