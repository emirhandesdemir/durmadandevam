'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import PostCard from '@/components/posts/PostCard';
import { Loader2 } from 'lucide-react';

export default function SurfPage() {
  const [videoPosts, setVideoPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const postsRef = collection(db, 'posts');
    // Query for documents where videoUrl is a non-empty string.
    // This requires a composite index on (videoUrl, createdAt).
    const q = query(
      postsRef,
      where('videoUrl', '>', ''),
      orderBy('videoUrl'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setVideoPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching video posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (videoPosts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>Henüz hiç video yok.</p>
        <p>Keşfedilecek videolar burada görünecek.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-background space-y-4">
        {videoPosts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
