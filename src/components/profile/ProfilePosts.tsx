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
  profileUser: UserProfile;
  postType: 'image' | 'text';
}

export default function ProfilePosts({ userId, profileUser, postType }: ProfilePostsProps) {
    const { userData: currentUserData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    
    const isOwnProfile = currentUserData?.uid === userId;
    const isFollower = profileUser?.followers?.includes(currentUserData?.uid || '') || false;
    const canViewContent = !profileUser?.privateProfile || isFollower || isOwnProfile;
    const amIBlockedByThisUser = profileUser?.blockedUsers?.includes(currentUserData?.uid || '');

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
            where('uid', '==', userId), 
            where('retweetOf', '==', null), // Retweetleri gösterme
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

    const filteredPosts = posts.filter(post => {
        return postType === 'image' ? !!post.imageUrl : !post.imageUrl;
    });

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
  
    if (filteredPosts.length === 0) {
        return (
             <div className="text-center py-10 mt-4 text-muted-foreground">
                <CameraOff className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-lg font-semibold">Henüz Gönderi Yok</h2>
            </div>
        )
    }

    if (postType === 'image') {
        return (
             <>
                <div className="grid grid-cols-3 gap-1">
                    {filteredPosts.map((post) => (
                        <button 
                            key={post.id} 
                            className="group relative aspect-square block bg-muted/50 focus:outline-none"
                            onClick={() => setSelectedPost(post)}
                        >
                            <Image
                                src={post.imageUrl!}
                                alt="Kullanıcı gönderisi"
                                fill
                                className="object-cover"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <Heart className="h-5 w-5 fill-white"/>
                                        <span className="font-bold text-sm">{post.likeCount}</span>
                                    </div>
                                    {!post.commentsDisabled && (
                                         <div className="flex items-center gap-1">
                                            <MessageCircle className="h-5 w-5 fill-white"/>
                                            <span className="font-bold text-sm">{post.commentCount}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                 {selectedPost && (
                    <PostViewerDialog 
                        post={selectedPost} 
                        open={!!selectedPost} 
                        onOpenChange={(open) => { if (!open) setSelectedPost(null) }}
                    />
                )}
            </>
        )
    }

    if (postType === 'text') {
        return (
            <div className="space-y-0">
                {filteredPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>
        )
    }
}
