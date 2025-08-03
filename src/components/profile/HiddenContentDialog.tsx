// src/components/profile/HiddenContentDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { Post } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { unhidePost } from '@/lib/actions/userActions';
import Image from 'next/image';

interface HiddenContentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenPostIds: string[];
}

export default function HiddenContentDialog({ isOpen, onOpenChange, hiddenPostIds }: HiddenContentDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [hiddenPosts, setHiddenPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [unhidingId, setUnhidingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || hiddenPostIds.length === 0) {
      setHiddenPosts([]);
      return;
    }

    const fetchPosts = async () => {
      setLoading(true);
      try {
        const fetchedPosts: Post[] = [];
        for (let i = 0; i < hiddenPostIds.length; i += 30) {
          const batchIds = hiddenPostIds.slice(i, i + 30);
          if (batchIds.length === 0) continue;
          const q = query(collection(db, 'posts'), where('__name__', 'in', batchIds));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            fetchedPosts.push({ id: doc.id, ...doc.data() } as Post);
          });
        }
        setHiddenPosts(fetchedPosts);
      } catch (error) {
        console.error('Gizlenen gönderiler getirilirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [isOpen, hiddenPostIds]);

  const handleUnhide = async (postId: string) => {
    if (!currentUser) return;
    setUnhidingId(postId);
    try {
        await unhidePost(currentUser.uid, postId);
        toast({ description: "Gönderi artık akışınızda görünecek." });
        setHiddenPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e: any) {
        toast({ variant: 'destructive', description: "İşlem geri alınamadı." });
    } finally {
        setUnhidingId(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gizlenen İçerikler</DialogTitle>
          <DialogDescription>
            "İlgilenmiyorum" olarak işaretlediğiniz ve akışınızda gizlenen gönderiler.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : hiddenPosts.length > 0 ? (
            <div className="space-y-2 px-4">
              {hiddenPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {post.imageUrl ? (
                             <Image src={post.imageUrl} alt="Post preview" width={40} height={40} className="h-10 w-10 rounded-md object-cover"/>
                        ): (
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
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                <EyeOff className="h-10 w-10 mb-2"/>
                <p>Gizlenen gönderi yok.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}