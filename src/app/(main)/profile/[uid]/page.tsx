'use client';

import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';
import { Separator } from '@/components/ui/separator';
import { deepSerialize } from '@/lib/server-utils';
import { Grid3x3, FileText, Bookmark, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SavedPostsGrid from '@/components/profile/SavedPostsGrid';
import type { UserProfile } from '@/lib/types';


interface UserProfilePageProps {
  params: { uid: string };
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { uid } = params;
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!uid) return;
      setLoading(true);
      setError(false);
      try {
        const profileUserRef = doc(db, 'users', uid);
        const postsQuery = query(collection(db, 'posts'), where('uid', '==', uid));
        
        const [profileUserSnap, postsCountSnap] = await Promise.all([
          getDoc(profileUserRef),
          getCountFromServer(postsQuery)
        ]);

        if (!profileUserSnap.exists()) {
          setError(true);
          return;
        }

        const profileUserData = profileUserSnap.data();
        profileUserData.postCount = postsCountSnap.data().count;
        const serializableProfileUser = deepSerialize(profileUserData);
        setProfileUser(serializableProfileUser);
      } catch (e) {
        console.error("Failed to fetch user data:", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    notFound();
  }
  
  if (!profileUser) {
      return null;
  }

  const isOwnProfile = currentUser?.uid === profileUser.uid;

  return (
    <>
      <ProfileViewLogger targetUserId={uid} />
      
      <div className="w-full mx-auto max-w-4xl py-4">
        <ProfileHeader profileUser={profileUser} />
        
        <Separator className="my-4" />

        <Tabs defaultValue="posts" className="w-full">
            <TabsList className={cn("grid w-full", isOwnProfile ? "grid-cols-3" : "grid-cols-2")}>
                <TabsTrigger value="posts">
                    <Grid3x3 className="h-5 w-5 mr-2" />
                    Gönderiler
                </TabsTrigger>
                {isOwnProfile && (
                     <TabsTrigger value="saved">
                        <Bookmark className="h-5 w-5 mr-2" />
                        Kaydedilenler
                    </TabsTrigger>
                )}
                 <TabsTrigger value="texts">
                    <FileText className="h-5 w-5 mr-2" />
                    Yazılar
                </TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="mt-4">
                <ProfilePosts 
                    userId={uid} 
                    postType="image"
                />
            </TabsContent>
            {isOwnProfile && (
                <TabsContent value="saved" className="mt-4">
                     <SavedPostsGrid 
                        userId={uid}
                     />
                </TabsContent>
            )}
            <TabsContent value="texts" className="mt-4">
                 <ProfilePosts 
                    userId={uid} 
                    postType="text"
                />
            </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
