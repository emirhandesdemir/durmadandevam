
// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';

interface ProfilePageProps {
  params: {
    uid: string;
  };
}

// A more robust converter that handles both actual Timestamp instances and plain objects.
const convertTimestamp = (value: any): string | null => {
    if (!value) return null;
    if (value instanceof Timestamp) {
        return value.toDate().toISOString();
    }
    // Check for plain object structure as a fallback
    if (typeof value === 'object' && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
        return new Date(value.seconds * 1000 + value.nanoseconds / 1000000).toISOString();
    }
    // If it's already a string or some other primitive, return it as is, or null if invalid
    return typeof value === 'string' ? value : null;
}


export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { uid } = params;
  
  const profileUserRef = doc(db, 'users', uid);
  const profileUserSnap = await getDoc(profileUserRef);
  
  if (!profileUserSnap.exists()) {
    notFound();
  }
  
  const profileUserData = profileUserSnap.data() as UserProfile;

  // Robustly serialize all Timestamp objects before passing to client components.
  const serializableProfileUser = {
    ...profileUserData,
    createdAt: convertTimestamp(profileUserData.createdAt),
    followRequests: (profileUserData.followRequests || []).map(req => ({
      ...req,
      requestedAt: convertTimestamp(req.requestedAt),
    })),
  };

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
