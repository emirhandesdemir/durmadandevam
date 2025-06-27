// src/components/profile/ProfilePosts.tsx
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/components/posts/PostsFeed';
import PostCard from '@/components/posts/PostCard';
import { Card, CardContent } from '../ui/card';

interface ProfilePostsProps {
  userId: string;
}

/**
 * Belirli bir kullanıcının gönderilerini çeken ve listeleyen sunucu bileşeni.
 */
export default async function ProfilePosts({ userId }: ProfilePostsProps) {
  // Kullanıcının gönderilerini çekmek için sorgu
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, where('uid', '==', userId), orderBy('createdAt', 'desc'), limit(20));
  const querySnapshot = await getDocs(q);
  
  const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

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
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
