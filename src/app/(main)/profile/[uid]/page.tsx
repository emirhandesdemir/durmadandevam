// src/app/(main)/profile/[uid]/page.tsx
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Grid3x3, Clapperboard, Contact } from 'lucide-react';
import { deepSerialize } from '@/lib/server-utils';

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
      <div className="container mx-auto max-w-4xl px-0 sm:px-4 py-4">
        <ProfileHeader profileUser={serializableProfileUser} />

        <Tabs defaultValue="posts" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none">
            <TabsTrigger value="posts" className="rounded-none"><Grid3x3 /></TabsTrigger>
            <TabsTrigger value="reels" disabled className="rounded-none"><Clapperboard /></TabsTrigger>
            <TabsTrigger value="tagged" disabled className="rounded-none"><Contact /></TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
             <ProfilePosts 
                userId={uid} 
                profileUser={serializableProfileUser} 
            />
          </TabsContent>
          <TabsContent value="reels">
            <p className="text-center text-muted-foreground p-8">Reels içeriği yakında.</p>
          </TabsContent>
          <TabsContent value="tagged">
             <p className="text-center text-muted-foreground p-8">Etiketlenen gönderiler yakında.</p>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
