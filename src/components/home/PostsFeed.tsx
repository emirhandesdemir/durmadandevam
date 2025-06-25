
"use client";

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PostCard, { type Post } from './PostCard';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

/**
 * Kullanıcı gönderilerini dikey bir akışta gösteren bileşen.
 */
export default function PostsFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const postsData: Post[] = [];
            querySnapshot.forEach((doc) => {
                postsData.push({ id: doc.id, ...doc.data() } as Post);
            });
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (posts.length === 0) {
        return (
             <Card className="text-center p-8">
                <CardContent className="p-0">
                  <p className="text-muted-foreground">Henüz hiç gönderi yok.</p>
                  <p className="text-muted-foreground">İlk gönderiyi sen paylaş!</p>
                </CardContent>
             </Card>
        )
    }

    return (
        <div className="space-y-4">
            {posts.map(post => (
                <PostCard
                    key={post.id}
                    post={post}
                />
            ))}
        </div>
    );
}
