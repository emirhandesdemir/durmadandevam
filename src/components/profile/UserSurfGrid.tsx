// src/components/profile/UserSurfGrid.tsx
"use client";

import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Clapperboard, ShieldOff, Lock } from 'lucide-react';
import { Heart, MessageCircle } from 'lucide-react';
import PostViewerDialog from '@/components/posts/PostViewerDialog';

interface UserSurfGridProps {
  profileUser: UserProfile;
}

export default function UserSurfGrid({ profileUser }: UserSurfGridProps) {
    const { userData: currentUserData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const isOwnProfile = currentUserData?.uid === profileUser.uid;
    const isFollower = useMemo(() => profileUser?.followers?.includes(currentUserData?.uid || '') || false, [profileUser, currentUserData]);
    const canViewContent = useMemo(() => !profileUser?.privateProfile || isFollower || isOwnProfile, [profileUser, isFollower, isOwnProfile]);
    const amIBlockedByThisUser = useMemo(() => profileUser?.blockedUsers?.includes(currentUserData?.uid || ''), [profileUser, currentUserData]);

    useEffect(() => {
        if (authLoading || !profileUser) return;

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
            where('videoUrl', '!=', null), // Sadece video içerenleri al
            orderBy('videoUrl'),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(fetchedPosts);
            setLoading(false);
        }, (error) => {
            console.error("Surf videoları çekilirken hata:", error);
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
            <p>İçeriği görmek için bu hesabı takip et.</p>
          </div>
        );
    }
  
    if (posts.length === 0) {
        return (
             <div className="text-center py-10 mt-4 text-muted-foreground">
                <Clapperboard className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-lg font-semibold">Henüz Surf Videosu Yok</h2>
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                    <button 
                        key={post.id} 
                        className="group relative aspect-square block bg-black focus:outline-none"
                        onClick={() => setSelectedPost(post)}
                    >
                        {post.videoUrl && (
                             <video src={post.videoUrl} className="w-full h-full object-cover" muted />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <Heart className="h-5 w-5 fill-white"/>
                                    <span className="font-bold text-sm">{post.likeCount}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MessageCircle className="h-5 w-5 fill-white"/>
                                    <span className="font-bold text-sm">{post.commentCount}</span>
                                </div>
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
