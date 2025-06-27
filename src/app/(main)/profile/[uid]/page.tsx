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

// Helper function to reliably check for Timestamp-like objects
const isTimestamp = (value: any): value is Timestamp => {
  return value && typeof value.toDate === 'function';
};

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
    createdAt: isTimestamp(profileUserData.createdAt)
      ? profileUserData.createdAt.toDate().toISOString()
      : null,
    
    followRequests: (profileUserData.followRequests || []).map(req => ({
      ...req,
      requestedAt: isTimestamp(req.requestedAt)
        ? req.requestedAt.toDate().toISOString()
        : null,
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
