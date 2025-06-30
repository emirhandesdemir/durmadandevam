// src/components/posts/PostsFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import PostCard from './PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function PostsFeed() {
    const { user, userData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(100)); // Fetch more posts for sorting

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Post));
            
            // Filter out posts from users the current user has blocked
            if (userData?.blockedUsers) {
                postsData = postsData.filter(post => !userData.blockedUsers.includes(post.uid));
            }

            // Apply custom sorting if the user is male
            if (userData?.gender === 'male') {
                const femalePosts = postsData.filter(p => p.userGender === 'female');
                const otherPosts = postsData.filter(p => p.userGender !== 'female');
                const finalFeed = [];
                let fIndex = 0, oIndex = 0;
                
                // Interleave posts with a 2:1 female-to-other ratio
                while(fIndex < femalePosts.length || oIndex < otherPosts.length) {
                    if (fIndex < femalePosts.length) finalFeed.push(femalePosts[fIndex++]);
                    if (fIndex < femalePosts.length) finalFeed.push(femalePosts[fIndex++]);
                    if (oIndex < otherPosts.length) finalFeed.push(otherPosts[oIndex++]);
                }
                postsData = finalFeed;
            }

            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, userData]);

    if (loading) {
        return (
            <div className="space-y-4 w-full">
                <Skeleton className="h-[200px] w-full rounded-2xl" />
                <Skeleton className="h-[200px] w-full rounded-2xl" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <p>Henüz hiç gönderi yok.</p>
                <p>Takip ettiğin kişilerin gönderileri burada görünecek.</p>
            </div>
        );
    }
    
    return (
        <div className="w-full">
             <div className="divide-y divide-border bg-card/50">
                {posts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>
        </div>
    );
}
