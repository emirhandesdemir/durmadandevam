// src/app/(main)/profile/hidden-content/manage/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Post } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { unhidePost } from '@/lib/actions/userActions';
import Link from 'next/link';

export default function HiddenContentManagePage() {
    const { userData, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [hiddenPosts, setHiddenPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [unhidingId, setUnhidingId] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading || !userData) {
            if (!authLoading) setLoading(false);
            return;
        }

        const hiddenPostIds = userData.hiddenPostIds || [];
        if (hiddenPostIds.length === 0) {
            setLoading(false);
            return;
        }

        const fetchPosts = async () => {
            setLoading(true);
            try {
                const fetchedPosts: Post[] = [];
                for (let i = 0; i < hiddenPostIds.length; i += 30) {
                    const batchIds = hiddenPostIds.slice(i, i + 30);
                    if (batchIds.length > 0) {
                        const q = query(collection(db, 'posts'), where('__name__', 'in', batchIds));
                        const querySnapshot = await getDocs(q);
                        querySnapshot.forEach((doc) => {
                            fetchedPosts.push({ id: doc.id, ...doc.data() } as Post);
                        });
                    }
                }
                setHiddenPosts(fetchedPosts);
            } catch (error) {
                console.error('Gizlenen gönderiler getirilirken hata:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [userData, authLoading]);

    const handleUnhide = async (postId: string) => {
        if (!userData) return;
        setUnhidingId(postId);
        try {
            await unhidePost(userData.uid, postId);
            toast({ description: "Gönderi artık akışınızda görünecek." });
            setHiddenPosts(prev => prev.filter(p => p.id !== postId));
        } catch (e: any) {
            toast({ variant: 'destructive', description: "İşlem geri alınamadı." });
        } finally {
            setUnhidingId(null);
        }
    };

    return (
        <div>
            <header className="flex items-center p-2 border-b">
                <Button asChild variant="ghost" className="rounded-full">
                    <Link href="/profile/feed-settings"><ChevronLeft className="mr-2 h-4 w-4"/> Akış Ayarları</Link>
                </Button>
                <h1 className="text-lg font-semibold mx-auto">Gizlenen Gönderiler</h1>
            </header>
            <div className="p-4">
                {authLoading || loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : hiddenPosts.length > 0 ? (
                    <div className="space-y-2">
                        {hiddenPosts.map((post) => (
                            <div key={post.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {post.imageUrl ? (
                                        <Image src={post.imageUrl} alt="Post preview" width={40} height={40} className="h-10 w-10 rounded-md object-cover"/>
                                    ) : (
                                        <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground"><EyeOff/></div>
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-semibold truncate">@{post.username}'in gönderisi</p>
                                        <p className="text-xs text-muted-foreground truncate">{post.text || "Resimli gönderi"}</p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUnhide(post.id)}
                                    disabled={unhidingId === post.id}
                                >
                                    {unhidingId === post.id ? <Loader2 className='h-4 w-4 animate-spin'/> : <Eye className='mr-2 h-4 w-4'/>}
                                    {unhidingId !== post.id && "Görünür Yap"}
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground text-center pt-16">
                        <EyeOff className="h-12 w-12 mb-2"/>
                        <h3 className="font-semibold">Gizlenen gönderi yok.</h3>
                        <p className="text-sm">Akışınızdaki gönderileri gizleyebilirsiniz.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
