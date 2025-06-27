// src/components/profile/ProfilePosts.tsx
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  // Kullanıcının gönderilerini çekmek için sorgu.
  // Not: Normalde bu sorgu, veritabanında bir birleşik indeks (composite index) gerektirir.
  // Bu indeksi oluşturmadan hatayı çözmek için, sıralamayı veritabanı yerine sunucuda yapıyoruz.
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, where('uid', '==', userId));
  const querySnapshot = await getDocs(q);
  
  // Dokümanları al ve Post tipine dönüştür.
  let posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

  // Gönderileri sunucu tarafında en yeniden eskiye doğru sırala.
  posts.sort((a, b) => {
    const timeA = a.createdAt?.toMillis() || 0;
    const timeB = b.createdAt?.toMillis() || 0;
    return timeB - timeA;
  });

  // Sıralamadan sonra limiti uygula.
  const limitedPosts = posts.slice(0, 20);

  if (limitedPosts.length === 0) {
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
      {limitedPosts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
