// src/components/posts/PostsFeed.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import PostCard from './PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { hidePost } from '@/lib/actions/userActions';

export default function PostsFeed() {
    const { user, userData, loading: authLoading } = useAuth();
    const { i18n } = useTranslation();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [clientHiddenIds, setClientHiddenIds] = useState<string[]>([]);

    const sortedPosts = useMemo(() => {
        let postsData = [...posts];

        const allHiddenIds = new Set([...(userData?.hiddenPostIds || []), ...clientHiddenIds]);
        
        // Filter out posts from blocked users and hidden posts
        postsData = postsData.filter(post => 
            !userData?.blockedUsers?.includes(post.uid) && !allHiddenIds.has(post.id)
        );
        
        // Language-based sorting
        const postsInUserLanguage = postsData.filter(p => p.language === i18n.language);
        const otherLanguagePosts = postsData.filter(p => p.language !== i18n.language);

        let languageSortedFeed = [];
        let langIndex = 0;
        let otherIndex = 0;
        while (langIndex < postsInUserLanguage.length || otherIndex < otherLanguagePosts.length) {
             // Add 3 posts from user's language
            for (let i = 0; i < 3 && langIndex < postsInUserLanguage.length; i++) {
                languageSortedFeed.push(postsInUserLanguage[langIndex++]);
            }
            // Add 1 post from other languages
            if (otherIndex < otherLanguagePosts.length) {
                languageSortedFeed.push(otherLanguagePosts[otherIndex++]);
            }
        }

        // Apply gender-based sorting if the user is male
        if (userData?.gender === 'male') {
            const femalePosts = languageSortedFeed.filter(p => p.userGender === 'female');
            const otherPosts = languageSortedFeed.filter(p => p.userGender !== 'female');
            const finalFeed = [];
            let fIndex = 0, oIndex = 0;
            
            // Interleave posts with a 2:1 female-to-other ratio
            while(fIndex < femalePosts.length || oIndex < otherPosts.length) {
                if (fIndex < femalePosts.length) finalFeed.push(femalePosts[fIndex++]);
                if (fIndex < femalePosts.length) finalFeed.push(femalePosts[fIndex++]);
                if (oIndex < otherPosts.length) finalFeed.push(otherPosts[oIndex++]);
            }
            return finalFeed;
        } else {
            return languageSortedFeed;
        }
    }, [posts, userData, i18n.language, clientHiddenIds]);
    
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
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(100));

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
                <Skeleton className="h-[200px] w-full rounded-2xl" />
                <Skeleton className="h-[200px] w-full rounded-2xl" />
            </div>
        );
    }

    if (sortedPosts.length === 0) {
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
                {sortedPosts.map(post => (
                    <PostCard key={post.id} post={post} onHide={handleHidePost} />
                ))}
            </div>
        </div>
    );
}
