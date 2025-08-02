'use client';

import { useEffect, useState } from 'react';
import type { Post } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getSavedPosts } from '@/lib/actions/userActions';
import { Loader2, Bookmark, Lock, Video, FileTextIcon } from 'lucide-react';
import Image from 'next/image';
import PostViewerDialog from '@/components/posts/PostViewerDialog';

interface SavedPostsGridProps {
  userId: string;
}

export default function SavedPostsGrid({ userId }: SavedPostsGridProps) {
    const { userData: currentUserData, loading: authLoading } = useAuth();
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const isOwnProfile = currentUserData?.uid === userId;

    useEffect(() => {
        if (!isOwnProfile || !userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        getSavedPosts(userId)
            .then(setSavedPosts)
            .finally(() => setLoading(false));
    }, [userId, isOwnProfile]);

    if (authLoading || loading) {
        return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!isOwnProfile) {
        return (
          <div className="text-center py-10 mt-4 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Burası Gizli</h2>
            <p>Sadece kullanıcı kendi kaydettiklerini görebilir.</p>
          </div>
        );
    }
  
    if (savedPosts.length === 0) {
        return (
             <div className="text-center py-10 mt-4 text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-lg font-semibold">Henüz Kaydedilen Gönderi Yok</h2>
                <p>Beğendiğin gönderileri daha sonra bulmak için kaydet.</p>
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-3 gap-1">
                {savedPosts.map((post) => (
                    <button 
                        key={post.id} 
                        className="group relative aspect-square block bg-muted/50 focus:outline-none"
                        onClick={() => setSelectedPost(post)}
                    >
                        {post.imageUrl ? (
                           <Image
                                src={post.imageUrl}
                                alt="Kaydedilen gönderi"
                                fill
                                sizes="(max-width: 768px) 33vw, 25vw"
                                className="object-cover"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        ) : post.videoUrl ? (
                            <div className="w-full h-full flex items-center justify-center bg-black">
                                <Video className="h-12 w-12 text-white/50"/>
                                <video src={post.videoUrl} className="absolute inset-0 w-full h-full object-cover -z-10" muted/>
                            </div>
                        ) : (
                             <div className="w-full h-full flex items-center justify-center p-2">
                                <FileTextIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
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
