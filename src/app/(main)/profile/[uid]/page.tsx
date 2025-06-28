// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';

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

  // The JSON.parse(JSON.stringify()) is a robust way to ensure that any non-plain objects
  // (like Firestore Timestamps) are converted to a serializable format (like an ISO string)
  // before being passed from a Server Component to a Client Component. This resolves the error.
  const serializableProfileUser = JSON.parse(JSON.stringify(profileUserData)) as UserProfile;


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
