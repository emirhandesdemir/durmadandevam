// src/components/profile/UserPostsGrid.tsx
"use client";

import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CameraOff, ShieldOff, Lock } from 'lucide-react';
import Image from 'next/image';
import PostViewerDialog from '@/components/posts/PostViewerDialog';
import { Heart, MessageCircle } from 'lucide-react';

interface UserPostsGridProps {
  profileUser: UserProfile;
}

export default function UserPostsGrid({ profileUser }: UserPostsGridProps) {
    const { userData: currentUserData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const isOwnProfile = currentUserData?.uid === profileUser.uid;
    const isFollower = useMemo(() => {
        // FIX: Ensure profileUser.followers exists before calling .includes()
        if (!profileUser?.followers || !currentUserData?.uid) return false;
        return profileUser.followers.includes(currentUserData.uid);
    }, [profileUser, currentUserData]);

    const canViewContent = useMemo(() => !profileUser?.privateProfile || isFollower || isOwnProfile, [profileUser, isFollower, isOwnProfile]);
    const amIBlockedByThisUser = useMemo(() => profileUser?.blockedUsers?.includes(currentUserData?.uid || ''), [profileUser, currentUserData]);

    useEffect(() => {
        // FIX: Explicitly wait for auth to finish before doing anything
        if (authLoading) return;
        
        // No need to check for profileUser, it's a required prop.

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
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)).filter(p => !p.videoUrl);
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
        <>
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
                                alt="Kullanıcı gönderisi"
                                fill
                                sizes="(max-width: 768px) 33vw, 25vw"
                                className="object-cover"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        ) : (
                             <div className={`w-full h-full flex items-center justify-center p-2 text-primary-foreground ${post.backgroundStyle || 'bg-muted'}`}>
                                <p className="text-xs font-bold text-center line-clamp-4">{post.text}</p>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-4">
                            {!post.likesHidden && (
                                <div className="flex items-center gap-1">
                                    <Heart className="h-5 w-5 fill-white"/>
                                    <span className="font-bold text-sm">{post.likeCount}</span>
                                </div>
                            )}
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
                    onOpenChange={(open) => {
                        if (!open) setSelectedPost(null)
                    }}
                />
            )}
        </>
    );
}
