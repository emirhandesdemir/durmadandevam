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

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { uid } = params;
  
  const profileUserRef = doc(db, 'users', uid);
  const profileUserSnap = await getDoc(profileUserRef);
  
  if (!profileUserSnap.exists()) {
    notFound();
  }
  
  const profileUserData = profileUserSnap.data() as UserProfile;

  // This is the crucial part: manually serializing Timestamp objects.
  // We need to convert any Firestore Timestamp to a simple string (ISO format)
  // before passing it to a Client Component like ProfileHeader or ProfilePosts.
  const serializableProfileUser = {
    ...profileUserData,
    // Convert the main createdAt field
    createdAt: profileUserData.createdAt instanceof Timestamp 
        ? profileUserData.createdAt.toDate().toISOString() 
        : null, // Default to null if not a valid Timestamp
    
    // Also convert the timestamp inside the followRequests array
    followRequests: (profileUserData.followRequests || []).map(req => ({
      ...req,
      requestedAt: req.requestedAt instanceof Timestamp 
        ? req.requestedAt.toDate().toISOString()
        : null, // Default to null if not a valid Timestamp
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
