// src/components/profile/ProfilePosts.tsx
"use client";

import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CameraOff, ShieldOff, Play, Lock, Bookmark } from 'lucide-react';
import Image from 'next/image';
import { Heart, MessageCircle } from 'lucide-react';
import PostViewerDialog from '@/components/posts/PostViewerDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProfilePostsProps {
  userId: string;
}

export default function ProfilePosts({ userId }: ProfilePostsProps) {
    const { userData: currentUserData, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    
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
        if (authLoading || !profileUser) return;
        if (!canViewContent || amIBlockedByThisUser) {
            setLoading(false);
            setPosts([]);
            setSavedPosts([]);
            return;
        }

        setLoading(true);
        const postsRef = collection(db, 'posts');
        const userPostsQuery = query(postsRef, where('uid', '==', userId), orderBy('createdAt', 'desc'));
        
        const unsubUserPosts = onSnapshot(userPostsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(fetchedPosts);
            setLoading(false);
        }, (error) => {
            console.error("Gönderiler çekilirken hata:", error);
            setLoading(false);
        });

        let unsubSavedPosts = () => {};
        if (isOwnProfile && profileUser.savedPosts && profileUser.savedPosts.length > 0) {
            const savedPostIds = profileUser.savedPosts.slice(0, 30);
            const savedPostsQuery = query(postsRef, where('__name__', 'in', savedPostIds));
            unsubSavedPosts = onSnapshot(savedPostsQuery, (snapshot) => {
                const fetchedSavedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                setSavedPosts(fetchedSavedPosts);
            });
        }

        return () => { 
            unsubUserPosts();
            unsubSavedPosts();
        };
    }, [userId, canViewContent, authLoading, amIBlockedByThisUser, profileUser, isOwnProfile]);

    const renderPostGrid = (postsToRender: Post[]) => {
        if (postsToRender.length === 0) {
            return (
                 <div className="text-center py-10 mt-4 text-muted-foreground">
                    <CameraOff className="h-12 w-12 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold">Henüz Gönderi Yok</h2>
                </div>
            )
        }
        return (
            <div className="grid grid-cols-3 gap-1">
                {postsToRender.map((post) => (
                    <button 
                        key={post.id} 
                        className="group relative aspect-square block bg-muted/50 focus:outline-none"
                        onClick={() => setSelectedPost(post)}
                    >
                        {post.videoUrl && <Play className="absolute top-2 right-2 h-5 w-5 text-white drop-shadow-lg" />}
                        {post.imageUrl || post.videoUrl ? (
                            <Image
                                src={post.imageUrl || post.videoUrl!} // Use videoUrl as fallback for thumbnail
                                alt="Kullanıcı gönderisi"
                                fill
                                className="object-cover"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        ) : (
                             <div className="flex h-full w-full items-center justify-center p-4">
                                <p className="text-xs text-muted-foreground line-clamp-5">{post.text}</p>
                            </div>
                        )}
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
        )
    };
    
    if (authLoading || loading) {
        return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (amIBlockedByThisUser) return null;

    if (!canViewContent) {
        return (
          <div className="text-center py-10 mt-4 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Bu Hesap Gizli</h2>
            <p>Gönderilerini görmek için bu hesabı takip et.</p>
          </div>
        );
    }
  
    return (
        <>
            <Tabs defaultValue="posts" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="posts">Gönderiler</TabsTrigger>
                    {isOwnProfile && <TabsTrigger value="saved"><Bookmark className="h-4 w-4 mr-2"/>Kaydedilenler</TabsTrigger>}
                </TabsList>
                <TabsContent value="posts" className="mt-4">
                    {renderPostGrid(posts)}
                </TabsContent>
                {isOwnProfile && (
                     <TabsContent value="saved" className="mt-4">
                        {renderPostGrid(savedPosts)}
                    </TabsContent>
                )}
            </Tabs>

            {selectedPost && (
                <PostViewerDialog 
                    post={selectedPost} 
                    open={!!selectedPost} 
                    onOpenChange={(open) => { if (!open) setSelectedPost(null) }}
                />
            )}
        </>
    );
}
