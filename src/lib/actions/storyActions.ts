'use server';

import { db, storage } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  writeBatch,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import type { Story, UserProfile, UserStoryReel } from '../types';

export async function createStory(
  userId: string,
  mediaDataUrl: string,
  mediaType: 'image' | 'video'
) {
  if (!userId || !mediaDataUrl) {
    throw new Error('Kullanıcı ID ve medya gerekli.');
  }

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('Kullanıcı bulunamadı.');
  }
  const userData = userSnap.data() as UserProfile;

  const storiesRef = collection(db, 'stories');
  const filePath = `stories/${userId}/${uuidv4()}`;
  const storageRef = ref(storage, filePath);

  const uploadResult = await uploadString(storageRef, mediaDataUrl, 'data_url');
  const mediaUrl = await getDownloadURL(uploadResult.ref);

  const twentyFourHoursFromNow = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

  const newStory: Omit<Story, 'id'> = {
    uid: userId,
    userInfo: {
      username: userData.username,
      photoURL: userData.photoURL || null,
    },
    mediaUrl,
    mediaType,
    createdAt: serverTimestamp() as Timestamp,
    expiresAt: twentyFourHoursFromNow,
    viewedBy: [],
  };

  const batch = writeBatch(db);
  batch.set(doc(storiesRef), newStory);
  batch.update(userRef, { lastStoryAt: serverTimestamp() });
  await batch.commit();

  revalidatePath('/home');

  return { success: true };
}


export async function getStoryFeed(userId: string): Promise<UserStoryReel[]> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return [];

  const userData = userSnap.data() as UserProfile;
  const followingIds = userData.following || [];
  const allUserIds = [userId, ...followingIds];

  if (allUserIds.length === 0) return [];
  
  const now = Timestamp.now();
  
  // Create chunks for 'in' query
  const chunks: string[][] = [];
  for (let i = 0; i < allUserIds.length; i += 30) {
    chunks.push(allUserIds.slice(i, i + 30));
  }

  const stories: Story[] = [];

  for (const chunk of chunks) {
    const storiesQuery = query(
      collection(db, 'stories'),
      where('uid', 'in', chunk),
      where('expiresAt', '>', now)
    );
    const storiesSnapshot = await getDocs(storiesQuery);
    storiesSnapshot.docs.forEach(doc => stories.push({ id: doc.id, ...doc.data() } as Story));
  }

  const userStoriesMap: Record<string, UserStoryReel> = {};

  for (const story of stories) {
      if (!userStoriesMap[story.uid]) {
          const userDoc = allUserIds.find(id => id === story.uid) ? await getDoc(doc(db, 'users', story.uid)) : null;
          const userInfo = userDoc?.data() as UserProfile | undefined;
          
          userStoriesMap[story.uid] = {
              uid: story.uid,
              username: userInfo?.username || 'Bilinmeyen',
              photoURL: userInfo?.photoURL || null,
              stories: [],
              hasUnseenStories: false
          };
      }
      userStoriesMap[story.uid].stories.push(story);
  }

  Object.values(userStoriesMap).forEach(userReel => {
    userReel.stories.sort((a, b) => (a.createdAt as Timestamp).seconds - (b.createdAt as Timestamp).seconds);
    userReel.hasUnseenStories = userReel.stories.some(s => !s.viewedBy.includes(userId));
  });

  const storyReels = Object.values(userStoriesMap);
  
  // Sort reels: current user first, then users with unseen stories, then by most recent story
  storyReels.sort((a, b) => {
    if (a.uid === userId) return -1;
    if (b.uid === userId) return 1;
    if (a.hasUnseenStories && !b.hasUnseenStories) return -1;
    if (!a.hasUnseenStories && b.hasUnseenStories) return 1;
    const lastStoryA = (a.stories[a.stories.length - 1]?.createdAt as Timestamp)?.seconds || 0;
    const lastStoryB = (b.stories[b.stories.length - 1]?.createdAt as Timestamp)?.seconds || 0;
    return lastStoryB - lastStoryA;
  });

  return storyReels;
}

export async function markStoryAsViewed(storyId: string, viewerId: string) {
    if(!storyId || !viewerId) return;

    const storyRef = doc(db, 'stories', storyId);
    try {
        await updateDoc(storyRef, {
            viewedBy: arrayUnion(viewerId)
        });
    } catch(error) {
        console.error("Error marking story as viewed:", error);
        // Fail silently
    }
}
