// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';

type ProfilePageProps = {
    params: { uid: string };
};

/**
 * Recursively converts Firestore Timestamps within an object or array to ISO strings.
 * This is the robust way to ensure data is serializable before passing from
 * Server Components to Client Components.
 * @param data The object, array, or primitive to serialize.
 * @returns The serialized data.
 */
function deepSerialize(data: any): any {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  // Handle Firestore Timestamps
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  
  // Handle plain objects that look like Timestamps (a common case)
  if (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number' && Object.keys(data).length === 2) {
    return new Date(data.seconds * 1000 + data.nanoseconds / 1000000).toISOString();
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

  // Recursively serialize the entire object to ensure no Timestamps are passed.
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
