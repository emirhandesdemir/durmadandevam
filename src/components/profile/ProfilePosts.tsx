// src/components/profile/ProfilePosts.tsx
"use client";

import { collection, query, where, Timestamp, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '../types';
import { Card, CardContent } from '../ui/card';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CameraOff, FileText as FileTextIcon, ShieldOff } from 'lucide-react';
import Image from 'next/image';
import { Heart, MessageCircle } from 'lucide-react';
import PostViewerDialog from '@/components/posts/PostViewerDialog';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ProfilePostsProps {
  userId: string;
  postType: 'image' | 'text';
}

export default function ProfilePosts({ userId, postType }: ProfilePostsProps) {
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
        const q = query(postsRef, where('uid', '==', userId), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
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
        return null;
    }

    if (!canViewContent) {
        return (
          <div className="text-center py-10 mt-4">
            <ShieldOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold">Bu Hesap Gizli</h2>
            <p className="text-muted-foreground">Gönderilerini görmek için bu hesabı takip et.</p>
          </div>
        );
    }
  
    if (filteredPosts.length === 0) {
      return (
          <Card className="text-center p-8 border-none shadow-none mt-4">
              <CardContent className="p-0 flex flex-col items-center">
                  {postType === 'image' ? <CameraOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" /> : <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />}
                  <h3 className="text-lg font-semibold">{postType === 'image' ? 'Henüz Resimli Gönderi Yok' : 'Henüz Metin Paylaşımı Yok'}</h3>
              </CardContent>
          </Card>
      );
    }
    
    // RENDER IMAGE GRID
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
                                src={post.imageUrl!} // We know it exists due to filter
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

    // RENDER TEXT LIST
    if (postType === 'text') {
        return (
             <>
                <div className="space-y-3">
                    {filteredPosts.map((post) => (
                         <button 
                            key={post.id} 
                            className="w-full text-left"
                            onClick={() => setSelectedPost(post)}
                        >
                            <Card className="p-4 hover:bg-muted/50 transition-colors">
                                <p className="line-clamp-4 text-sm whitespace-pre-wrap">{post.text}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t">
                                     <span>{formatDistanceToNow((post.createdAt as Timestamp).toDate(), { addSuffix: true, locale: tr })}</span>
                                    <div className="flex items-center gap-1"><Heart className="h-4 w-4"/> {post.likeCount}</div>
                                    <div className="flex items-center gap-1"><MessageCircle className="h-4 w-4"/> {post.commentCount}</div>
                                </div>
                            </Card>
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
        )
    }

    return null;
}
