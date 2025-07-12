'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Post } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Play, Pause, Volume2, VolumeX, Bookmark, MoreHorizontal, Music } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { likePost, toggleSavePost } from '@/lib/actions/postActions';
import CommentSheet from '@/components/comments/CommentSheet';
import { useToast } from '@/hooks/use-toast';

interface SurfVideoCardProps {
  post: Post;
  isActive: boolean;
}

export default function SurfVideoCard({ post, isActive }: SurfVideoCardProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);

  const [optimisticLiked, setOptimisticLiked] = useState(post.likes?.includes(user?.uid || ''));
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(post.likeCount || 0);
  const [optimisticSaved, setOptimisticSaved] = useState(false);
  const [optimisticSaveCount, setOptimisticSaveCount] = useState(post.saveCount || 0);

  useEffect(() => {
    if (userData) {
      setOptimisticSaved(userData.savedPosts?.includes(post.id) ?? false);
    }
    setOptimisticLiked(post.likes?.includes(user?.uid || ''));
    setOptimisticLikeCount(post.likeCount || 0);
    // setOptimisticSaveCount(post.saveCount || 0); // This should be fetched if you want to display save count
  }, [post, user, userData]);

  useEffect(() => {
    if (isActive && videoRef.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Video play failed", e));
    } else if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  
  const handleLike = useCallback(async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Beğenmek için giriş yapmalısınız.' });
      return;
    }
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticLikeCount(p => wasLiked ? p - 1 : p + 1);
    try {
      await likePost(post.id, {
        uid: user.uid,
        displayName: userData.username,
        photoURL: userData.photoURL || null,
        userAvatarFrame: userData.selectedAvatarFrame
      });
    } catch (error) {
      setOptimisticLiked(wasLiked);
      setOptimisticLikeCount(p => wasLiked ? p + 1 : p - 1);
      toast({ variant: "destructive", description: "Beğenirken bir hata oluştu." });
    }
  }, [user, userData, post.id, optimisticLiked, toast]);

  const handleDoubleClick = useCallback(() => {
    if (!user) {
        toast({
            variant: 'destructive',
            description: 'Beğenmek için giriş yapmalısınız.',
        });
        return;
    }
    if (!optimisticLiked) {
        handleLike();
    }
    setShowLikeAnimation(true);
    setTimeout(() => {
        setShowLikeAnimation(false);
    }, 600);
  }, [user, optimisticLiked, handleLike, toast]);
  
  const handleSave = useCallback(async () => {
    if (!user) {
        toast({ variant: 'destructive', description: 'Kaydetmek için giriş yapmalısınız.' });
        return;
    }
    const wasSaved = optimisticSaved;
    setOptimisticSaved(!wasSaved);

    try {
        await toggleSavePost(post.id, user.uid);
    } catch (error) {
        setOptimisticSaved(wasSaved);
        toast({ variant: "destructive", description: "Kaydedilirken bir hata oluştu." });
    }
}, [user, post.id, optimisticSaved, toast]);


  return (
    <>
      <div className="h-full w-full relative bg-black flex items-center justify-center" onDoubleClick={handleDoubleClick}>
        {showLikeAnimation && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <Heart className="text-white h-24 w-24 drop-shadow-lg animate-like-pop" fill="currentColor" />
            </div>
        )}
        <video
          ref={videoRef}
          src={post.videoUrl}
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          className="h-full w-full object-contain"
          onContextMenu={(e) => e.preventDefault()}
          onClick={togglePlay}
        />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <Play className="h-16 w-16 text-white/70" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
          <div className="flex items-end justify-between">
            <div className="text-white max-w-[calc(100%-60px)]">
              <Link href={`/profile/${post.uid}`} className="flex items-center gap-2 font-bold group pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <Avatar className="h-10 w-10 border-2 border-white">
                  <AvatarImage src={post.userAvatar || undefined} />
                  <AvatarFallback>{post.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="group-hover:underline">{post.username}</span>
              </Link>
              <p className="mt-2 text-sm line-clamp-2">{post.text}</p>
            </div>
            
            <div className="flex flex-col gap-4 pointer-events-auto">
              <Button variant="ghost" className="flex-col h-auto p-0 text-white" onClick={(e) => { e.stopPropagation(); handleLike(); }}>
                <Heart className={cn("h-8 w-8", optimisticLiked && "fill-destructive text-destructive")} />
                <span className="text-xs font-semibold">{optimisticLikeCount}</span>
              </Button>
              <Button variant="ghost" className="flex-col h-auto p-0 text-white" onClick={(e) => { e.stopPropagation(); setShowComments(true); }}>
                <MessageCircle className="h-8 w-8" />
                <span className="text-xs font-semibold">{post.commentCount}</span>
              </Button>
              <Button variant="ghost" className="flex-col h-auto p-0 text-white" onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                <Bookmark className={cn("h-8 w-8", optimisticSaved && "fill-white text-white")} />
                 {/* <span className="text-xs font-semibold">{optimisticSaveCount}</span> */}
              </Button>
               <Button variant="ghost" className="h-auto p-0 text-white" size="icon" onClick={(e) => { e.stopPropagation(); setIsMuted(p => !p); }}>
                {isMuted ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <CommentSheet open={showComments} onOpenChange={setShowComments} post={post} />
    </>
  );
}
