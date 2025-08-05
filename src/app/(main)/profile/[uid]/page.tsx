// src/app/(main)/profile/[id]/page.tsx
// Bu, bir kullanıcının profil sayfasını oluşturan sunucu bileşenidir.
// Sayfa yüklendiğinde sunucuda çalışır, veritabanından gerekli verileri
// (kullanıcı profili, gönderi sayısı vb.) çeker ve sayfayı oluşturur.
import { doc, getDoc, collection, query, where, getCountFromServer, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { Separator } from '@/components/ui/separator';
import { deepSerialize } from '@/lib/server-utils';
import { Grid3x3, Bookmark, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAuth } from '@/lib/firebaseAdmin';
import SavedPostsGrid from '@/components/profile/SavedPostsGrid';
import { cookies } from 'next/headers';
import { cn } from '@/lib/utils';
import UserPostsGrid from '@/components/profile/UserPostsGrid';
import type { UserProfile } from '@/lib/types';
import UserPostsFeed from '@/components/profile/UserPostsFeed';

interface UserProfilePageProps {
  params: { uid: string };
}

async function getAuthenticatedUser() {
    try {
        const sessionCookie = cookies().get('session')?.value;
        if (!sessionCookie) return null;
        return await getAuth().verifySessionCookie(sessionCookie, true);
    } catch (error) {
        // Session cookie is invalid or expired.
        // This is a normal scenario for logged-out users.
        return null;
    }
}

async function findUserByUid(uid: string): Promise<UserProfile | null> {
    if (!uid || uid === 'undefined') return null;
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
        return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
    }
    return null;
}


export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const authUser = await getAuthenticatedUser();
  const profileUserData = await findUserByUid(params.uid);

  if (!profileUserData) {
    notFound();
  }
  
  const uid = profileUserData.uid;
  const isOwnProfile = authUser?.uid === uid;
  
  const postsQuery = query(collection(db, 'posts'), where('uid', '==', uid));
  const postsCountSnap = await getCountFromServer(postsQuery);
  profileUserData.postCount = postsCountSnap.data().count;

  const serializableProfileUser = deepSerialize(profileUserData);
  
  return (
    <>
      <div className="w-full max-w-4xl">
        <ProfileHeader profileUser={serializableProfileUser} />
        
        <Separator className="my-0" />

        <Tabs defaultValue="posts-grid" className="w-full">
            <TabsList className={cn("grid w-full", isOwnProfile ? "grid-cols-3" : "grid-cols-2")}>
                <TabsTrigger value="posts-grid">
                    <Grid3x3 className="h-5 w-5 mr-2" />
                    Gönderiler (Izgara)
                </TabsTrigger>
                 <TabsTrigger value="posts-feed">
                    <List className="h-5 w-5 mr-2" />
                    Gönderiler (Akış)
                </TabsTrigger>
                {isOwnProfile && (
                    <TabsTrigger value="saved">
                        <Bookmark className="h-5 w-5 mr-2" />
                        Kaydedilenler
                    </TabsTrigger>
                )}
            </TabsList>
            <TabsContent value="posts-grid" className="mt-4">
                <UserPostsGrid profileUser={serializableProfileUser} />
            </TabsContent>
            <TabsContent value="posts-feed" className="mt-4">
                <UserPostsFeed profileUser={serializableProfileUser} />
            </TabsContent>
            {isOwnProfile && (
                <TabsContent value="saved" className="mt-4">
                    <SavedPostsGrid userId={uid} />
                </TabsContent>
            )}
        </Tabs>
      </div>
    </>
  );
}
