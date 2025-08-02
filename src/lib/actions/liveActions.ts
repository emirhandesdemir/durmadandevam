// src/lib/actions/liveActions.ts
'use server';
import { db } from '@/lib/firebase';
import { doc, collection, addDoc, serverTimestamp, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

interface HostInfo {
  uid: string;
  username: string;
  photoURL: string | null;
}

export async function startLiveStream(host: HostInfo, title: string) {
  if (!host || !host.uid) throw new Error("Host information is required.");
  if (!title.trim()) throw new Error("A title is required to start a live stream.");

  const livesRef = collection(db, 'lives');
  const newLiveDoc = await addDoc(livesRef, {
    hostId: host.uid,
    hostUsername: host.username,
    hostPhotoURL: host.photoURL,
    title,
    status: 'live',
    viewerCount: 0,
    createdAt: serverTimestamp(),
  });

  revalidatePath('/live');
  return { success: true, liveId: newLiveDoc.id };
}

export async function endLiveStream(liveId: string, hostId: string) {
  if (!liveId || !hostId) throw new Error("Live ID and Host ID are required.");

  const liveRef = doc(db, 'lives', liveId);
  const liveDoc = await getDoc(liveRef);

  if (!liveDoc.exists() || liveDoc.data().hostId !== hostId) {
    throw new Error("Live stream not found or you do not have permission to end it.");
  }

  await updateDoc(liveRef, {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
  
  // In a real scenario, you'd also cleanup the streaming server resources here.
  
  revalidatePath('/live');
  revalidatePath(`/live/${liveId}`);
  return { success: true };
}
