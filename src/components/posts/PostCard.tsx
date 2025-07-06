// src/components/posts/PostCard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { Post } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit, Loader2, BadgeCheck, Sparkles, Repeat, EyeOff, Volume2, VolumeOff, Play } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useState, useRef, useEffect, SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { deletePost, updatePost, likePost, retweetPost } from "@/lib/actions/postActions";
import { Timestamp } from "firebase/firestore";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "../ui/textarea";
import CommentSheet from "../comments/CommentSheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import Link from "next/link";
import QuoteRetweetDialog from "./QuoteRetweetDialog";


interface PostCardProps {
    post: Post;
    isStandalone?: boolean;
    onHide?: (postId: string) => void;
}

const safeParseTimestamp = (timestamp: any): Date => {
    if (!timestamp) {
        return new Date(0); 
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
        return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate().toISOString();
    }
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return new Date(0);
};


export default function PostCard({ post, isStandalone = false, onHide }: PostCardProps) {
    const { user: currentUser, userData: currentUserData } = useAuth();
    const { toast } = useToast();

    const [optimisticLiked, setOptimisticLiked] = useState(post.likes?.includes(currentUser?.uid || ''));
    const [optimisticLikeCount, setOptimisticLikeCount] = useState(post.likeCount);

    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(post.text || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [postToRetweet, setPostToRetweet] = useState<Post | null>(null);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    
    // Video State
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(false); // Start with sound
    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const wasLongPress = useRef(false);

    const toggleMute = () => {
        if (videoRef.current) {
            const newMutedState = !videoRef.current.muted;
            videoRef.current.muted = newMutedState;
            setIsMuted(newMutedState);
        }
    };

    const handlePressStart = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
        }
        wasLongPress.current = false;
        pressTimer.current = setTimeout(() => {
            wasLongPress.current = true;
            videoRef.current?.pause();
        }, 200); // Hold longer than 200ms to pause
    };

    const handlePressEnd = (e: SyntheticEvent) => {
        e.preventDefault();
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
        }

        if (wasLongPress.current) {
            videoRef.current?.play();
        } else {
            toggleMute();
        }
    };


    useEffect(() => {
        setOptimisticLiked(post.likes?.includes(currentUser?.uid || ''));
        setOptimisticLikeCount(post.likeCount);
    }, [post.likeCount, post.likes, currentUser]);


    const isOwner = currentUser?.uid === post.uid;
    
    const createdAtDate = safeParseTimestamp(post.createdAt);

    const timeAgo = post.createdAt
        ? formatDistanceToNow(createdAtDate, { addSuffix: true, locale: tr })
        : "az önce";

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setEditedText(post.text || '');
    }, [post.text]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'inherit';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [isEditing]);

    const handleLike = async () => {
        if (!currentUser || !currentUserData) return;
        const previousLiked = optimisticLiked;
        const previousLikeCount = optimisticLikeCount;
        setOptimisticLiked(!previousLiked);
        setOptimisticLikeCount(prev => previousLiked ? prev - 1 : prev + 1);
        try {
            await likePost(
                post.id,
                {
                    uid: currentUser.uid,
                    displayName: currentUserData.username || 'Biri',
                    photoURL: currentUserData.photoURL || null,
                    selectedAvatarFrame: currentUserData.selectedAvatarFrame || ''
                }
            );
        } catch (error) {
            setOptimisticLiked(previousLiked);
            setOptimisticLikeCount(previousLikeCount);
            console.error("Error liking post:", error);
            toast({ variant: "destructive", description: "Beğenirken bir hata oluştu." });
        }
    };
    
    const handleDoubleClick = () => {
        if (!currentUser) return;
        setShowLikeAnimation(true);
        setTimeout(() => {
            setShowLikeAnimation(false);
        }, 600);
        if (!optimisticLiked) {
            handleLike();
        }
    };

    const handleDelete = async () => {
        if (!isOwner) return;
        setIsDeleting(true);
        try {
            await deletePost(post.id);
            toast({ description: "Gönderi başarıyla silindi." });
        } catch (error: any) {
            console.error("Error deleting post:", error);
            toast({ variant: "destructive", description: error.message || "Gönderi silinirken bir hata oluştu." });
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!isOwner || !editedText.trim()) return;
        setIsSaving(true);
        try {
            await updatePost(post.id, editedText);
            toast({ description: "Gönderi güncellendi." });
            setIsEditing(false);
        } catch (error: any) {
            console.error("Error updating post:", error);
            toast({ variant: "destructive", description: "Gönderi güncellenirken bir hata oluştu." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCancelEdit = () => {
        setEditedText(post.text || '');
        setIsEditing(false);
    };

    const handleRetweet = () => {
        if (!currentUser || !currentUserData) {
            toast({ variant: "destructive", description: "Bu işlemi yapmak için giriş yapmalısınız." });
            return;
        }
        if (post.uid === currentUser.uid || post.retweetOf) return;
        setPostToRetweet(post);
    };
    
    const handleHide = () => {
        if (onHide) {
            onHide(post.id);
        }
    };

    if (post.retweetOf) {
        const originalPost = post.retweetOf;
        const originalCreatedAtDate = safeParseTimestamp(originalPost.createdAt);
        const originalTimeAgo = originalPost.createdAt
            ? formatDistanceToNow(originalCreatedAtDate, { addSuffix: true, locale: tr })
            : "az önce";

        return (
            <>
                <div className={cn("relative flex flex-col pt-3 bg-background", !isStandalone && "border-b")}>
                    
                    {showLikeAnimation && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <Heart className="text-white h-24 w-24 drop-shadow-lg animate-like-pop" fill="currentColor" />
                        </div>
                    )}
                    
                    <div className="flex items-start gap-3 px-4 pb-2">
                        <Link href={`/profile/${post.uid}`}>
                            <div className={cn("avatar-frame-wrapper", post.userAvatarFrame)}>
                                <Avatar className="relative z-[1] h-10 w-10">
                                    <AvatarImage src={post.userAvatar || undefined} />
                                    <AvatarFallback>{post.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                        </Link>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Link href={`/profile/${post.uid}`}><p className="font-bold text-sm hover:underline">{post.username}</p></Link>
                                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full -mr-2">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {isOwner ? (
                                            <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Sil</span></DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={handleHide}><EyeOff className="mr-2 h-4 w-4" /><span>İlgilenmiyorum</span></DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            {post.text && <p className="whitespace-pre-wrap text-sm mt-1">{post.text}</p>}
                        </div>
                    </div>

                    <div className="border rounded-xl mx-4 mb-2 overflow-hidden bg-card/50 cursor-pointer" onClick={() => {/* TODO: Open original post */}}>
                        <div className="p-3">
                            <div className="flex items-center gap-2">
                                <Link href={`/profile/${originalPost.uid}`}>
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={originalPost.userAvatar || undefined} />
                                        <AvatarFallback className="text-xs">{originalPost.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <Link href={`/profile/${originalPost.uid}`} className="font-bold text-xs hover:underline truncate">{originalPost.username}</Link>
                                <span className="text-xs text-muted-foreground shrink-0">{originalTimeAgo}</span>
                            </div>
                            {originalPost.text && <p className="whitespace-pre-wrap text-sm mt-2 line-clamp-4">{originalPost.text}</p>}
                        </div>
                        {originalPost.imageUrl && (
                             <div className="relative w-full aspect-video bg-muted" onDoubleClick={handleDoubleClick}>
                                <Image 
                                    src={originalPost.imageUrl} 
                                    alt="Retweeted post" 
                                    fill
                                    className="object-cover"
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="px-2 pt-1 pb-2">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className={cn("rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive", optimisticLiked && "text-destructive")} onClick={handleLike} disabled={!currentUser}>
                                <Heart className={cn("h-5 w-5", optimisticLiked && "fill-current")} />
                            </Button>
                            {!post.commentsDisabled && (
                                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => setShowComments(true)}>
                                    <MessageCircle className="h-5 w-5" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" disabled>
                                <Repeat className="h-5 w-5" />
                            </Button>
                        </div>
                         {(optimisticLikeCount > 0 || post.commentCount > 0) && (
                             <div className="mt-1 px-2 text-xs text-muted-foreground">
                                {!post.commentsDisabled && post.commentCount > 0 && <span>{post.commentCount || 0} yanıt</span>}
                                {(!post.likesHidden && optimisticLikeCount > 0) && (
                                    <>
                                        {!post.commentsDisabled && post.commentCount > 0 && <span className="mx-1">·</span>}
                                        <span>{optimisticLikeCount || 0} beğeni</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <CommentSheet open={showComments} onOpenChange={setShowComments} post={post} />
                <QuoteRetweetDialog isOpen={!!postToRetweet} onOpenChange={() => setPostToRetweet(null)} post={postToRetweet!} />
            </>
        )
    }
    
    return (
        <>
            <div className={cn("relative flex flex-col bg-background", !isStandalone && "border-b")}>
                {showLikeAnimation && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <Heart className="text-white h-24 w-24 drop-shadow-lg animate-like-pop" fill="currentColor" />
                    </div>
                )}
            
                <div className="flex items-start gap-3 p-4">
                    <Link href={`/profile/${post.uid}`}>
                        <div className={cn("avatar-frame-wrapper", post.userAvatarFrame)}>
                            <Avatar className="relative z-[1] h-10 w-10">
                                <AvatarImage src={post.userAvatar || undefined} />
                                <AvatarFallback>{post.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                            <Link href={`/profile/${post.uid}`}>
                                <p className="font-bold text-sm hover:underline">{post.username}</p>
                            </Link>
                            {post.userRole === 'admin' && (
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger><BadgeCheck className="h-4 w-4 text-primary fill-primary/20" /></TooltipTrigger>
                                        <TooltipContent><p>Yönetici</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {post.editedWithAI && (
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger className="flex items-center gap-1 text-primary font-semibold">
                                        <Sparkles className="h-3 w-3" />
                                        <span>AI ile düzenlendi</span>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Bu gönderideki resim HiweWalkAI ile düzenlenmiştir.</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full -mr-2">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {isOwner ? (
                                    <>
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /><span>Düzenle</span></DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Sil</span></DropdownMenuItem>
                                    </>
                                ) : (
                                    <DropdownMenuItem onClick={handleHide}>
                                        <EyeOff className="mr-2 h-4 w-4" />
                                        <span>İlgilenmiyorum</span>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                 {(post.text || isEditing) && (
                    <div className="px-4 pb-3 text-sm text-foreground/90">
                        {isEditing ? (
                            <div className="space-y-2">
                                <Textarea ref={textareaRef} value={editedText} onChange={(e) => setEditedText(e.target.value)} className="w-full resize-none bg-muted p-2 rounded-lg" onInput={(e) => { const target = e.currentTarget; target.style.height = 'inherit'; target.style.height = `${target.scrollHeight}px`; }} />
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>İptal</Button>
                                    <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Kaydet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            post.text && <p className="whitespace-pre-wrap">{post.text}</p>
                        )}
                    </div>
                 )}
                
                {post.imageUrl && !isEditing && (
                    <div className="relative w-full bg-muted cursor-pointer" onDoubleClick={handleDoubleClick}>
                        <Image
                            src={post.imageUrl}
                            alt="Gönderi resmi"
                            width={800}
                            height={800}
                            className="h-auto w-full max-h-[70vh] object-cover"
                            onContextMenu={(e) => e.preventDefault()}
                        />
                    </div>
                )}

                {post.videoUrl && !isEditing && (
                     <div 
                        className="relative w-full aspect-video bg-black cursor-pointer"
                        onMouseDown={handlePressStart}
                        onMouseUp={handlePressEnd}
                        onTouchStart={handlePressStart}
                        onTouchEnd={handlePressEnd}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <video
                            ref={videoRef}
                            src={post.videoUrl}
                            loop
                            autoPlay
                            playsInline
                            muted={isMuted}
                            className="h-full w-full object-contain"
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 p-4 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <Play className="h-8 w-8" />
                        </div>
                        <div
                            className="absolute bottom-3 right-3 z-10 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center pointer-events-none"
                        >
                            {isMuted ? <VolumeOff className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </div>
                    </div>
                )}
                
                <div className="px-2 pt-1 pb-2">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className={cn("rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive", optimisticLiked && "text-destructive")} onClick={handleLike} disabled={!currentUser}>
                           <Heart className={cn("h-5 w-5", optimisticLiked && "fill-current")} />
                        </Button>
                        {!post.commentsDisabled && (
                            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => setShowComments(true)}>
                                <MessageCircle className="h-5 w-5" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-green-500/10 hover:text-green-500" onClick={handleRetweet} disabled={!currentUser || isOwner}>
                           <Repeat className="h-5 w-5" />
                        </Button>
                    </div>

                    {(optimisticLikeCount > 0 || (post.commentCount > 0 && !post.commentsDisabled)) && (
                         <div className="mt-1 px-2 text-xs text-muted-foreground">
                            {!post.likesHidden && optimisticLikeCount > 0 && (
                                <span>{optimisticLikeCount || 0} beğeni</span>
                            )}
                             {(!post.likesHidden && optimisticLikeCount > 0) && (!post.commentsDisabled && post.commentCount > 0) && (
                                <span className="mx-1">·</span>
                            )}
                            {!post.commentsDisabled && post.commentCount > 0 && (
                                <span>{post.commentCount || 0} yanıt</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Emin misiniz?</AlertDialogTitle><AlertDialogDescription>Bu gönderiyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sil</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <CommentSheet open={showComments} onOpenChange={setShowComments} post={post} />
            <QuoteRetweetDialog isOpen={!!postToRetweet} onOpenChange={() => setPostToRetweet(null)} post={postToRetweet!} />
        </>
    );
}
