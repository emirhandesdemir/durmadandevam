// src/components/posts/PostsFeed.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import PostCard from './PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { hidePost } from '@/lib/actions/userActions';

export default function PostsFeed() {
    const { user, userData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [clientHiddenIds, setClientHiddenIds] = useState<string[]>([]);

    const filteredAndSortedPosts = useMemo(() => {
        if (!userData) return posts.filter(post => !post.videoUrl); // Filter for guest users too
        const allHiddenIds = new Set([...(userData.hiddenPostIds || []), ...clientHiddenIds]);
        // Also filter out posts from users the current user has blocked
        const blockedByCurrentUser = userData.blockedUsers || [];
        return posts.filter(post => 
            !post.videoUrl && // Exclude videos
            !allHiddenIds.has(post.id) && 
            !blockedByCurrentUser.includes(post.uid)
        );
    }, [posts, userData, clientHiddenIds]);

    const handleHidePost = async (postId: string) => {
        setClientHiddenIds(prev => [...prev, postId]);
        if (user) {
            await hidePost(user.uid, postId);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Post));
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);

    if (loading) {
        return (
            <div className="space-y-4 w-full">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
        );
    }

    if (filteredAndSortedPosts.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <p>Henüz hiç gönderi yok.</p>
                <p>Takip ettiğin kişilerin gönderileri burada görünecek.</p>
            </div>
        );
    }
    
    return (
        <div className="w-full">
             <div className="bg-background">
                {filteredAndSortedPosts.map(post => (
                    <PostCard key={post.id} post={post} onHide={handleHidePost} />
                ))}
            </div>
        </div>
    );
}
