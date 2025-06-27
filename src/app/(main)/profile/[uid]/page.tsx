// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';

interface ProfilePageProps {
  params: {
    uid: string;
  };
}

/**
 * Herhangi bir kullanıcının profilini görüntülemek için kullanılan dinamik sayfa.
 * @param params - URL'den gelen kullanıcı UID'sini içerir.
 */
export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { uid } = params;
  
  // Sadece profil verisini sunucu tarafında çek
  const profileUserRef = doc(db, 'users', uid);
  const profileUserSnap = await getDoc(profileUserRef);
  
  if (!profileUserSnap.exists()) {
    notFound(); // Kullanıcı bulunamazsa 404 sayfasına yönlendir
  }
  
  const profileUserData = profileUserSnap.data() as UserProfile;

  // Client Component'e geçirmeden önce veriyi serileştir.
  const plainProfileUser = JSON.parse(JSON.stringify(profileUserData));

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-8">
        <ProfileHeader 
          profileUser={plainProfileUser} 
        />
        <ProfilePosts 
            userId={uid} 
            profileUser={plainProfileUser} 
        />
      </div>
    </div>
  );
}
