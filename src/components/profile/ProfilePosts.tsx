// src/components/profile/ProfilePosts.tsx
"use client";

import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/components/posts/PostsFeed';
import PostCard from '@/components/posts/PostCard';
import { Card, CardContent } from '../ui/card';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProfilePostsProps {
  userId: string;
  profileUser: any;
}

/**
 * Belirli bir kullanıcının gönderilerini çeken ve listeleyen istemci bileşeni.
 * Gizlilik durumuna göre içeriği gösterir veya gizler.
 */
export default function ProfilePosts({ userId, profileUser }: ProfilePostsProps) {
    const { userData: currentUser, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    // Auth durumu yüklendikten sonra yetki kontrolü yap
    const isOwnProfile = currentUser?.uid === userId;
    const isFollower = (profileUser.followers || []).includes(currentUser?.uid || '');
    const canViewContent = !profileUser.privateProfile || isFollower || isOwnProfile;

    useEffect(() => {
        // Auth durumu yüklenene kadar veya içeriği görüntüleme yetkisi yoksa beklet.
        if (authLoading || !canViewContent) {
            setLoading(false);
            return;
        }

        const fetchPosts = async () => {
            setLoading(true);
            try {
                const postsRef = collection(db, 'posts');
                // The query now only filters by user ID, removing the orderBy clause that requires an index.
                const q = query(postsRef, where('uid', '==', userId));
                const querySnapshot = await getDocs(q);
                
                const fetchedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

                // Sorting is now done on the client-side after fetching, newest first.
                fetchedPosts.sort((a, b) => {
                    const timeA = (a.createdAt as Timestamp).toMillis();
                    const timeB = (b.createdAt as Timestamp).toMillis();
                    return timeB - timeA;
                });

                setPosts(fetchedPosts);
            } catch (error) {
                console.error("Gönderiler çekilirken hata:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [userId, canViewContent, authLoading]);

    if (authLoading || loading) {
        return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!canViewContent) {
        return (
          <div className="text-center py-10 border-t">
            <h2 className="text-lg font-semibold">Bu Hesap Gizli</h2>
            <p className="text-muted-foreground">Gönderilerini görmek için bu hesabı takip et.</p>
          </div>
        );
    }
  
    if (posts.length === 0) {
      return (
          <Card className="text-center p-8 border-dashed rounded-xl mt-4">
              <CardContent className="p-0">
                  <h3 className="text-lg font-semibold">Henüz Gönderi Yok</h3>
                  <p className="text-muted-foreground mt-2">Bu kullanıcı henüz bir şey paylaşmadı.</p>
              </CardContent>
          </Card>
      );
    }

    return (
        <div className="flex flex-col gap-8 border-t pt-8">
            {posts.map((post: Post) => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
}
