// src/components/posts/PostsFeed.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
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
    
    const followingIds = useMemo(() => userData?.following || [], [userData]);

    useEffect(() => {
        // Fix: Add guard clauses for authLoading and followingIds length.
        // This ensures the query does not run with an undefined or empty `followingIds` array.
        if (authLoading || !user) {
            setLoading(false);
            return;
        }
        
        if (followingIds.length === 0) {
            setLoading(false);
            setPosts([]);
            return;
        }

        setLoading(true);
        const postsRef = collection(db, 'posts');
        const q = query(
            postsRef, 
            where('uid', 'in', followingIds), 
            orderBy('createdAt', 'desc'), 
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching friends posts:", error);
            setLoading(false);
        });
        
        return () => unsubscribe();

    }, [user, followingIds, authLoading]);
    
    const filteredAndSortedPosts = useMemo(() => {
        if (!posts || !userData) return [];
        const allHiddenIds = new Set([...(userData.hiddenPostIds || []), ...clientHiddenIds]);
        return posts.filter(post => 
            !post.videoUrl && 
            !allHiddenIds.has(post.id) &&
            !userData.blockedUsers?.includes(post.uid)
        );
    }, [posts, userData, clientHiddenIds]);

    const handleHidePost = async (postId: string) => {
        setClientHiddenIds(prev => [...prev, postId]);
        if (user) {
            await hidePost(user.uid, postId);
        }
    };

    if (loading) {
        return (
             <div className="space-y-4 w-full">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
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
