// src/components/profile/ProfilePosts.tsx
"use client";

import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CameraOff, ShieldOff, Play, Lock } from 'lucide-react';
import Image from 'next/image';
import { Heart, MessageCircle } from 'lucide-react';
import PostViewerDialog from '@/components/posts/PostViewerDialog';
import PostCard from '@/components/posts/PostCard';


interface ProfilePostsProps {
  userId: string;
}

export default function ProfilePosts({ userId }: ProfilePostsProps) {
    const { userData: currentUserData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    
    // Listen for real-time updates on the profile user's document
    useEffect(() => {
        const userDocRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setProfileUser(docSnap.data() as UserProfile);
            } else {
                setProfileUser(null);
            }
        });
        return () => unsubscribe();
    }, [userId]);

    const isOwnProfile = currentUserData?.uid === userId;
    const isFollower = profileUser?.followers?.includes(currentUserData?.uid || '') || false;
    const canViewContent = !profileUser?.privateProfile || isFollower || isOwnProfile;
    const amIBlockedByThisUser = profileUser?.blockedUsers?.includes(currentUserData?.uid || '');

    useEffect(() => {
        if (authLoading || !profileUser) {
            // Wait for auth and profile data to be loaded
            return;
        }

        if (!canViewContent || amIBlockedByThisUser) {
            setLoading(false);
            setPosts([]);
            return;
        }

        setLoading(true);
        const postsRef = collection(db, 'posts');
        const q = query(
            postsRef, 
            where('uid', '==', userId),
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
    }, [userId, canViewContent, authLoading, amIBlockedByThisUser, profileUser]);

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
                <h2 className="text-lg font-semibold">Henüz Gönderi Yok</h2>
            </div>
        )
    }

    return (
        <div className="space-y-0">
            {posts.map(post => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    )
}
