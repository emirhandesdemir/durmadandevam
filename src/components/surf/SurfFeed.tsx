'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import { Loader2, VideoOff, Compass, ArrowLeft } from 'lucide-react';
import SurfVideoCard from './SurfVideoCard';
import { Button } from '../ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SurfFeed() {
  const [videoPosts, setVideoPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const router = useRouter();

  useEffect(() => {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('videoUrl', '>', ''),
      orderBy('videoUrl'),
      orderBy('createdAt', 'desc'),
      limit(25) // Limit initial load for performance
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
    if (videoPosts.length === 0) return;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: 0.6, // Fire when 60% of the video is visible
    });

    const currentObserver = observerRef.current;
    const videos = containerRef.current?.children;
    if (videos) {
      Array.from(videos).forEach(video => {
          if (video) currentObserver.observe(video as Element);
      });
    }

    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
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
      <div className="flex flex-col h-full items-center justify-center text-center text-white p-4">
        <Compass className="h-16 w-16 mb-4" />
        <h3 className="font-semibold text-lg">Keşfedilecek Video Yok</h3>
        <p className="mt-2 text-muted-foreground">Surf akışını başlatan ilk kişi sen ol!</p>
         <Button asChild className="mt-4">
            <Link href="/create-surf">Video Yükle</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="absolute top-4 left-4 z-20 text-white bg-black/30 hover:bg-black/50 rounded-full"
            aria-label="Geri"
        >
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <div ref={containerRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory overscroll-contain scroll-smooth hide-scrollbar">
            {videoPosts.map((post, index) => (
                <div key={post.id} data-index={index} className="h-full w-full snap-start relative flex items-center justify-center bg-black shrink-0">
                  <SurfVideoCard post={post} isActive={index === activeIndex} />
                </div>
            ))}
        </div>
    </div>
  );
}
