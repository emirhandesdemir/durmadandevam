// src/lib/actions/propagationActions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, collectionGroup } from 'firebase/firestore';

async function processQueryInBatches(queryToProcess: any, updates: any) {
    // Firestore allows up to 500 writes in a single batch.
    // We process in smaller chunks to be safe.
    const BATCH_SIZE = 400; 
    
    const snapshot = await getDocs(queryToProcess);
    if (snapshot.empty) return;

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach((doc) => {
            batch.update(doc.ref, updates);
        });
        await batch.commit();
    }
}


export async function updateUserPosts(uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;
    
    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.userPhotoURL) propagationUpdates.userPhotoURL = updates.userPhotoURL;
    if (updates.userAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.userAvatarFrame;
    
    if (Object.keys(propagationUpdates).length === 0) return;

    // Update main posts
    const userPostsQuery = query(collection(db, 'posts'), where('uid', '==', uid));
    await processQueryInBatches(userPostsQuery, propagationUpdates);

    // Update retweeted posts by this user
    const retweetPostsQuery = query(collection(db, 'posts'), where('retweetOf.uid', '==', uid));
    const retweetSnapshot = await getDocs(retweetPostsQuery);
    if(!retweetSnapshot.empty) {
        const batch = writeBatch(db);
        retweetSnapshot.forEach(doc => {
            const currentRetweetData = doc.data().retweetOf;
            batch.update(doc.ref, {
                retweetOf: {
                    ...currentRetweetData,
                    username: propagationUpdates.username || currentRetweetData.username,
                    userPhotoURL: propagationUpdates.userPhotoURL !== undefined ? propagationUpdates.userPhotoURL : currentRetweetData.userPhotoURL,
                    userAvatarFrame: propagationUpdates.userAvatarFrame !== undefined ? propagationUpdates.userAvatarFrame : currentRetweetData.userAvatarFrame
                }
            })
        });
        await batch.commit();
    }
}

export async function updateUserComments(uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;

    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.userPhotoURL) propagationUpdates.photoURL = updates.userPhotoURL;
    if (updates.userAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.userAvatarFrame;
    
    if (Object.keys(propagationUpdates).length === 0) return;

    const commentsQuery = query(collectionGroup(db, 'comments'), where('uid', '==', uid));
    await processQueryInBatches(commentsQuery, propagationUpdates);
}

export async function updateUserDmMessages(uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;

    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates['participantInfo.' + uid + '.username'] = updates.username;
    if (updates.userPhotoURL !== undefined) propagationUpdates['participantInfo.' + uid + '.photoURL'] = updates.userPhotoURL;
    if (updates.userAvatarFrame !== undefined) propagationUpdates['participantInfo.' + uid + '.selectedAvatarFrame'] = updates.userAvatarFrame;

    if (Object.keys(propagationUpdates).length === 0) return;
    
    const dmsQuery = query(collection(db, 'directMessagesMetadata'), where('participantUids', 'array-contains', uid));
    await processQueryInBatches(dmsQuery, propagationUpdates);
}