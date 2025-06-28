// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';
import { Separator } from '@/components/ui/separator';
import { deepSerialize } from '@/lib/server-utils';
import { Grid3x3 } from 'lucide-react';

interface UserProfilePageProps {
  params: { uid: string };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { uid } = params;

  const profileUserRef = doc(db, 'users', uid);
  const postsQuery = query(collection(db, 'posts'), where('uid', '==', uid));

  const [profileUserSnap, postsCountSnap] = await Promise.all([
    getDoc(profileUserRef),
    getCountFromServer(postsQuery)
  ]);

  if (!profileUserSnap.exists()) {
    notFound();
  }

  const profileUserData = profileUserSnap.data();
  profileUserData.postCount = postsCountSnap.data().count;

  const serializableProfileUser = deepSerialize(profileUserData);

  return (
    <>
      <ProfileViewLogger targetUserId={uid} />
      <div className="w-full mx-auto max-w-4xl py-4">
        <ProfileHeader profileUser={serializableProfileUser} />
        
        <Separator className="my-4" />

        {/* Simplified Posts Section */}
        <div className="w-full border-t">
            <div className="flex justify-center items-center p-3 text-sm font-semibold text-primary border-b-2 border-primary">
                <Grid3x3 className="h-5 w-5 mr-2" />
                <span>GÖNDERİLER</span>
            </div>
            <ProfilePosts 
                userId={uid} 
                profileUser={serializableProfileUser} 
            />
        </div>
      </div>
    </>
  );
}
