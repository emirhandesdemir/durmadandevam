// src/lib/actions/propagationActions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, collectionGroup } from 'firebase/firestore';

async function processQueryInBatches(queryToProcess: any, updates: any) {
    // Firestore allows up to 500 writes in a single batch.
    // We process in smaller chunks to be safe.
    const BATCH_SIZE = 400; 
    let lastDoc = null;
    
    while(true) {
        let q = queryToProcess;
        if(lastDoc) {
            q = query(q, BATCH_SIZE);
        } else {
            q = query(q, BATCH_SIZE);
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty) break;

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, updates);
        });
        await batch.commit();

        if (snapshot.size < BATCH_SIZE) break;

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
}


export async function updateUserPosts(uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;
    
    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates.username = updates.username;
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.selectedAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;
    
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
    if (updates.photoURL) propagationUpdates.photoURL = updates.photoURL;
    if (updates.selectedAvatarFrame !== undefined) propagationUpdates.userAvatarFrame = updates.selectedAvatarFrame;
    
    if (Object.keys(propagationUpdates).length === 0) return;

    const commentsQuery = query(collectionGroup(db, 'comments'), where('uid', '==', uid));
    await processQueryInBatches(commentsQuery, propagationUpdates);
}

export async function updateUserDmMessages(uid: string, updates: { [key: string]: any }) {
    if (!uid || !updates || Object.keys(updates).length === 0) return;

    const propagationUpdates: { [key: string]: any } = {};
    if (updates.username) propagationUpdates['participantInfo.' + uid + '.username'] = updates.username;
    if (updates.photoURL !== undefined) propagationUpdates['participantInfo.' + uid + '.photoURL'] = updates.photoURL;
    if (updates.selectedAvatarFrame !== undefined) propagationUpdates['participantInfo.' + uid + '.selectedAvatarFrame'] = updates.selectedAvatarFrame;

    if (Object.keys(propagationUpdates).length === 0) return;
    
    const dmsQuery = query(collection(db, 'directMessagesMetadata'), where('participantUids', 'array-contains', uid));
    await processQueryInBatches(dmsQuery, propagationUpdates);
}
