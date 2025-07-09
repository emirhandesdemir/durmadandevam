'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import { Loader2, VideoOff } from 'lucide-react';
import SurfVideoCard from './SurfVideoCard';

export default function SurfFeed() {
  const [videoPosts, setVideoPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const postsRef = collection(db, 'posts');
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
  
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setActiveIndex(index);
        }
    });
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: containerRef.current,
      threshold: 0.6,
    });

    const videos = containerRef.current?.children;
    if (videos) {
      Array.from(videos).forEach(video => {
        if (observerRef.current) {
          observerRef.current.observe(video);
        }
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    }
  }, [videoPosts.length, handleIntersection]);


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (videoPosts.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center text-muted-foreground p-4">
        <VideoOff className="h-16 w-16 mb-4" />
        <h3 className="font-semibold text-lg">Henüz Video Yok</h3>
        <p>Keşfedilecek videolar burada görünecek.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory hide-scrollbar">
      {videoPosts.map((post, index) => (
        <div key={post.id} data-index={index} className="h-full w-full snap-start relative flex items-center justify-center bg-black">
          <SurfVideoCard post={post} isActive={index === activeIndex} />
        </div>
      ))}
    </div>
  );
}
