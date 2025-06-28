// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';

/**
 * Recursively converts non-plain objects like Firestore Timestamps or Dates into a serializable format (ISO strings).
 * This function is crucial for passing data from Server Components to Client Components in Next.js.
 * It robustly handles various ways date/time information might be represented.
 * @param data The object, array, or primitive to serialize.
 * @returns The fully serialized data, safe to pass as props.
 */
function deepSerialize(data: any): any {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle Firestore Timestamps, which have a toDate method
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  
  // Handle plain objects that mimic Timestamps (e.g., { seconds: ..., nanoseconds: ... })
  // This can occur in certain server environments or when data is double-serialized.
  if (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
    return new Date(data.seconds * 1000 + data.nanoseconds / 1000000).toISOString();
  }

  // Handle arrays by recursively serializing each item
  if (Array.isArray(data)) {
    return data.map(item => deepSerialize(item));
  }
  
  // Handle general objects by recursively serializing each property
  const newObj: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      newObj[key] = deepSerialize(data[key]);
    }
  }

  return newObj;
}

// Define the props type directly here for clarity
interface UserProfilePageProps {
  params: { uid: string };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
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
