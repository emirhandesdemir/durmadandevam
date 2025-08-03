// src/components/posts/PostsFeed.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import PostCard from './PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { hidePost } from '@/lib/actions/userActions';
import { MessageSquareOff } from 'lucide-react';

export default function PostsFeed() {
    const { user, userData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [clientHiddenIds, setClientHiddenIds] = useState<string[]>([]);
    
    const followingIds = useMemo(() => userData?.following || [], [userData]);

    useEffect(() => {
        if (authLoading || !user) {
            setLoading(false);
            return;
        }

        if (followingIds.length === 0) {
            setLoading(false);
            setPosts([]); // Clear posts if not following anyone
            return;
        }

        setLoading(true);
        const postsRef = collection(db, 'posts');
        const qPosts = query(postsRef, where('uid', 'in', followingIds), orderBy('createdAt', 'desc'), limit(30));

        const unsubPosts = onSnapshot(qPosts, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching friends posts:", error);
            setLoading(false);
        });
        
        return () => {
            unsubPosts();
        };

    }, [followingIds, user, authLoading]);
    
    const combinedFeed = useMemo(() => {
        const allHiddenIds = new Set([...(userData?.hiddenPostIds || []), ...clientHiddenIds]);
        return posts.filter(post => 
            !allHiddenIds.has(post.id) &&
            !userData?.blockedUsers?.includes(post.uid)
        );
    }, [posts, userData, clientHiddenIds]);
    
    const handleHidePost = (postId: string) => {
         setClientHiddenIds(prev => [...prev, postId]);
        if (user) {
            hidePost(user.uid, postId);
        }
    }
    
    if (loading) {
        return (
             <div className="space-y-4 w-full mt-4">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (combinedFeed.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-16 px-4">
                <MessageSquareOff className="h-12 w-12 mx-auto mb-4" />
                <h3 className="font-semibold">Akış Boş</h3>
                <p>Takip ettiğin kişilerin gönderileri burada görünecek.</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="bg-background">
                {combinedFeed.map((item, index) => {
                    return <PostCard key={`post-${item.id}`} post={item as Post} onHide={handleHidePost} />;
                })}
            </div>
        </div>
    );
}