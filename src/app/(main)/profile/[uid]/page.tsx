// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import { auth } from '@/lib/firebase';

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
  
  // Sunucu tarafında oturum açmış kullanıcıyı al (isteğe bağlı)
  const currentUserId = auth.currentUser?.uid;

  // Profil verisini ve mevcut kullanıcının verisini Firestore'dan çek
  const profileUserRef = doc(db, 'users', uid);
  const profileUserSnap = await getDoc(profileUserRef);
  
  if (!profileUserSnap.exists()) {
    notFound(); // Kullanıcı bulunamazsa 404 sayfasına yönlendir
  }
  
  const profileUserData = profileUserSnap.data() as UserProfile;

  let currentUserData: UserProfile | null = null;
  if (currentUserId) {
    const currentUserRef = doc(db, 'users', currentUserId);
    const currentUserSnap = await getDoc(currentUserRef);
    if (currentUserSnap.exists()) {
      currentUserData = currentUserSnap.data() as UserProfile;
    }
  }

  // Kullanıcının takipçisi olup olmadığını kontrol et
  const isFollower = (profileUserData.followers || []).includes(currentUserId || '');
  const canViewContent = !profileUserData.privateProfile || isFollower || currentUserId === uid;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-8">
        <ProfileHeader 
          profileUser={profileUserData} 
          currentUser={currentUserData} 
        />
        {canViewContent ? (
          <ProfilePosts userId={uid} />
        ) : (
          <div className="text-center py-10 border-t">
            <h2 className="text-lg font-semibold">Bu Hesap Gizli</h2>
            <p className="text-muted-foreground">Gönderilerini görmek için bu hesabı takip et.</p>
          </div>
        )}
      </div>
    </div>
  );
}
