
// src/lib/actions/profileActions.ts
'use server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import type { ProfileViewer, UserProfile } from '../types';
import { deepSerialize } from '../server-utils';

export async function logProfileView(targetUserId: string, viewerId: string) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) return;

  const viewerRef = doc(db, 'users', targetUserId, 'profileViewers', viewerId);
  try {
    await setDoc(viewerRef, {
      viewedAt: serverTimestamp()
    }, { merge: true }); // Use set with merge to create or update timestamp
  } catch (error) {
    console.error("Error logging profile view:", error);
    // Fail silently on the client, but log error on the server.
  }
}

export async function getProfileViewers(userId: string): Promise<ProfileViewer[]> {
  const viewersRef = collection(db, 'users', userId, 'profileViewers');
  const q = query(viewersRef, orderBy('viewedAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  
  const viewers = snapshot.docs.map(doc => ({
    uid: doc.id,
    viewedAt: doc.data().viewedAt,
  }));

  // Fetch user data for each viewer
  if (viewers.length > 0) {
      const viewerUids = viewers.map(v => v.uid);
      const usersRef = collection(db, 'users');
      // Firestore 'in' query supports up to 30 items per query
      const userQuery = query(usersRef, where('uid', 'in', viewerUids.slice(0,30)));
      const userSnap = await getDocs(userQuery);
      const userMap = new Map<string, UserProfile>();
      userSnap.forEach(doc => userMap.set(doc.id, doc.data() as UserProfile));

      const populatedViewers = viewers.map(viewer => ({
          ...viewer,
          username: userMap.get(viewer.uid)?.username || 'Bilinmeyen Kullanıcı',
          photoURL: userMap.get(viewer.uid)?.photoURL || null,
          selectedAvatarFrame: userMap.get(viewer.uid)?.selectedAvatarFrame || ''
      }));

      // İstemciye göndermeden önce `viewedAt` Timestamp'lerini güvenli hale getir.
      return deepSerialize(populatedViewers);
  }

  return [];
}
