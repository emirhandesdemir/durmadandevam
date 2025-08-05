// src/components/profile/UserPostsFeed.tsx
'use client';

import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CameraOff, ShieldOff, Lock } from 'lucide-react';
import PostCard from '@/components/posts/PostCard'; // Reuse PostCard for feed view

interface UserPostsFeedProps {
  profileUser: UserProfile;
}

export default function UserPostsFeed({ profileUser }: UserPostsFeedProps) {
    const { userData: currentUserData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    const isOwnProfile = currentUserData?.uid === profileUser.uid;
    const isAdmin = currentUserData?.role === 'admin';
    const isFollower = useMemo(() => {
        if (!profileUser?.followers || !currentUserData?.uid) return false;
        return profileUser.followers.includes(currentUserData.uid);
    }, [profileUser, currentUserData]);

    const canViewContent = useMemo(() => !profileUser?.privateProfile || isFollower || isOwnProfile || isAdmin, [profileUser, isFollower, isOwnProfile, isAdmin]);
    const amIBlockedByThisUser = useMemo(() => profileUser?.blockedUsers?.includes(currentUserData?.uid || ''), [profileUser, currentUserData]);

    useEffect(() => {
        if (authLoading) return;
        
        if (!canViewContent || amIBlockedByThisUser) {
            setLoading(false);
            setPosts([]);
            return;
        }

        setLoading(true);
        const postsRef = collection(db, 'posts');
        const q = query(
            postsRef, 
            where('uid', '==', profileUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(fetchedPosts);
            setLoading(false);
        }, (error) => {
            console.error("Gönderiler çekilirken hata:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profileUser, canViewContent, authLoading, amIBlockedByThisUser]);

    if (authLoading || loading) {
        return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (amIBlockedByThisUser) {
         return (
          <div className="text-center py-10 mt-4 text-muted-foreground">
            <ShieldOff className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Kullanıcı Engellendi</h2>
          </div>
        );
    }

    if (!canViewContent) {
        return (
          <div className="text-center py-10 mt-4 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Bu Hesap Gizli</h2>
            <p>Gönderilerini görmek için bu hesabı takip et.</p>
          </div>
        );
    }
  
    if (posts.length === 0) {
        return (
             <div className="text-center py-10 mt-4 text-muted-foreground">
                <CameraOff className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-lg font-semibold">Henüz Hiç Gönderi Yok</h2>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
}
