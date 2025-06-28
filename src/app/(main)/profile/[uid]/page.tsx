// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';

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
  
  // Directly serialize Firestore data before passing to client components
  const serializableProfileUser = JSON.parse(JSON.stringify(profileUserSnap.data()));

  return (
    <>
      <ProfileViewLogger targetUserId={uid} />
      <div className="container mx-auto max-w-2xl px-4 py-6 md:py-8">
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
