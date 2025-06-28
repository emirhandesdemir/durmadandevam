// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';

/**
 * Recursively converts Firestore Timestamps or Timestamp-like objects within any data structure to ISO strings.
 * This is the definitive solution to prevent "Only plain objects can be passed to Client Components" errors.
 * @param data The object, array, or primitive to serialize.
 * @returns The serialized data, safe to pass to Client Components.
 */
function deepSerialize(data: any): any {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle Firestore Timestamps (both class instances and plain objects)
  if ((data instanceof Timestamp || (typeof data.toDate === 'function')) || (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number')) {
    return new Date(data.seconds * 1000 + (data.nanoseconds || 0) / 1000000).toISOString();
  }
  
  // Handle arrays by recursively serializing each item
  if (Array.isArray(data)) {
    return data.map(item => deepSerialize(item));
  }
  
  // Handle general objects by recursively serializing each value
  const newObj: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      newObj[key] = deepSerialize(data[key]);
    }
  }

  return newObj;
}


export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { uid } = params;
  
  const profileUserRef = doc(db, 'users', uid);
  const profileUserSnap = await getDoc(profileUserRef);
  
  if (!profileUserSnap.exists()) {
    notFound();
  }
  
  const profileUserData = profileUserSnap.data();

  // Recursively serialize the entire object to ensure no non-plain objects are passed.
  const serializableProfileUser = deepSerialize(profileUserData) as UserProfile;

  return (
    <>
      <ProfileViewLogger targetUserId={uid} />
      <div className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-8">
          <ProfileHeader 
            profileUser={serializableProfileUser} 
          />
          <ProfilePosts 
              userId={uid} 
              profileUser={serializableProfileUser} 
          />
        </div>
      </div>
    </>
  );
}
