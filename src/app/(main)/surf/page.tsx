'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import { Loader2, Compass } from 'lucide-react';
import Image from 'next/image';
import PostViewerDialog from '@/components/posts/PostViewerDialog';

export default function SurfPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    useEffect(() => {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Post))
                .filter(post => post.imageUrl || post.videoUrl); // Only show visual content
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching surf posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
            <div className="container mx-auto px-2 py-4">
                <div className="flex items-center gap-3 mb-6">
                    <Compass className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Keşfet</h1>
                </div>
                {posts.length === 0 ? (
                     <div className="text-center text-muted-foreground py-10">
                        <p>Keşfedilecek yeni bir şey yok.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1">
                         {posts.map((post) => (
                            <button 
                                key={post.id} 
                                className="group relative aspect-square block bg-muted/50 focus:outline-none"
                                onClick={() => setSelectedPost(post)}
                            >
                                {post.imageUrl ? (
                                    <Image
                                        src={post.imageUrl}
                                        alt="Keşfet gönderisi"
                                        fill
                                        className="object-cover"
                                    />
                                ) : post.videoUrl ? (
                                    <video
                                        src={post.videoUrl}
                                        loop
                                        muted
                                        playsInline
                                        className="h-full w-full object-cover"
                                    />
                                ) : null}
                            </button>
                        ))}
                    </div>
                )}
            </div>
             {selectedPost && (
                <PostViewerDialog 
                    post={selectedPost} 
                    open={!!selectedPost} 
                    onOpenChange={(open) => { if (!open) setSelectedPost(null) }}
                />
            )}
        </>
    );
}
