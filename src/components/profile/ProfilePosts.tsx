// src/components/profile/ProfilePosts.tsx
"use client";

import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Post } from '@/components/posts/PostsFeed';
import { Card, CardContent } from '../ui/card';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CameraOff, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';

interface ProfilePostsProps {
  userId: string;
  profileUser: any;
}

export default function ProfilePosts({ userId, profileUser }: ProfilePostsProps) {
    const { userData: currentUser, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    const isOwnProfile = currentUser?.uid === userId;
    const isFollower = (profileUser.followers || []).includes(currentUser?.uid || '');
    const canViewContent = !profileUser.privateProfile || isFollower || isOwnProfile;

    useEffect(() => {
        if (authLoading) {
            return;
        }
        if (!canViewContent) {
            setLoading(false);
            return;
        }

        const fetchPosts = async () => {
            setLoading(true);
            try {
                const postsRef = collection(db, 'posts');
                const q = query(postsRef, where('uid', '==', userId));
                const querySnapshot = await getDocs(q);
                
                const fetchedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                
                fetchedPosts.sort((a, b) => {
                    const timeA = a.createdAt ? (a.createdAt as Timestamp).toMillis() : 0;
                    const timeB = b.createdAt ? (b.createdAt as Timestamp).toMillis() : 0;
                    return timeB - timeA;
                });

                setPosts(fetchedPosts);
            } catch (error) {
                console.error("Gönderiler çekilirken hata:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [userId, canViewContent, authLoading]);

    if (authLoading || loading) {
        return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!canViewContent) {
        return (
          <div className="text-center py-10 mt-4">
            <h2 className="text-lg font-semibold">Bu Hesap Gizli</h2>
            <p className="text-muted-foreground">Gönderilerini görmek için bu hesabı takip et.</p>
          </div>
        );
    }
  
    if (posts.length === 0) {
      return (
          <Card className="text-center p-8 border-none shadow-none mt-4">
              <CardContent className="p-0 flex flex-col items-center">
                  <CameraOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Henüz Gönderi Yok</h3>
              </CardContent>
          </Card>
      );
    }

    return (
        <div className="grid grid-cols-3 gap-1 mt-1">
            {posts.map((post) => (
                <Link href="#" key={post.id} className="group relative aspect-[4/5] block bg-muted/50">
                    {post.imageUrl ? (
                        <Image
                            src={post.imageUrl}
                            alt="Kullanıcı gönderisi"
                            fill
                            className="object-cover"
                        />
                    ) : (
                       <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                           <FileText className="h-6 w-6 text-muted-foreground mb-2"/>
                           <p className="text-muted-foreground text-xs line-clamp-5">{post.text}</p>
                       </div>
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
                </Link>
            ))}
        </div>
    );
}
