// src/components/posts/PostCard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { Post } from "./PostsFeed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit, Loader2, BadgeCheck } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { deletePost, updatePost, likePost } from "@/lib/actions/postActions";
import { Timestamp } from "firebase/firestore";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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


interface PostCardProps {
    post: Post;
}

export default function PostCard({ post }: PostCardProps) {
    const { user: currentUser, userData: currentUserData } = useAuth();
    const { toast } = useToast();

    // State'ler
    const [isLiking, setIsLiking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(post.text || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showComments, setShowComments] = useState(false);

    // Kontroller
    const isOwner = currentUser?.uid === post.uid;
    const isLiked = currentUser ? (post.likes || []).includes(currentUser.uid) : false;
    
    // Güvenli tarih dönüşümü
    const createdAtDate = post.createdAt && 'seconds' in post.createdAt 
        ? new Timestamp(post.createdAt.seconds, post.createdAt.nanoseconds).toDate()
        : new Date();

    const timeAgo = post.createdAt
        ? formatDistanceToNow(createdAtDate, { addSuffix: true, locale: tr })
        : "az önce";

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Bu etki, yerel metin durumunu ebeveynden gelen prop ile senkronize eder.
    useEffect(() => {
        setEditedText(post.text || '');
    }, [post.text]);

    // Düzenleme moduna girildiğinde textarea'yı odakla ve boyutlandır
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'inherit';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [isEditing]);

    const handleLike = async () => {
        if (!currentUser || isLiking) return;
        setIsLiking(true);
        try {
            await likePost(
                post.id,
                {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    selectedAvatarFrame: currentUserData?.selectedAvatarFrame || ''
                }
            );
        } catch (error) {
            console.error("Error liking post:", error);
            toast({ variant: "destructive", description: "Beğenirken bir hata oluştu." });
        } finally {
            setIsLiking(false);
        }
    };

    const handleDelete = async () => {
        if (!isOwner) return;
        setIsDeleting(true);
        try {
            await deletePost(post.id, post.imagePublicId);
            toast({ description: "Gönderi başarıyla silindi." });
        } catch (error) {
            console.error("Error deleting post:", error);
            toast({ variant: "destructive", description: "Gönderi silinirken bir hata oluştu." });
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
        } catch (error) {
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
    
    return (
        <>
           <div className="flex gap-3 border-b p-4 transition-colors hover:bg-muted/50">
                {/* Avatar Column */}
                <div>
                    <Link href={`/profile/${post.uid}`}>
                         <div className={cn("avatar-frame-wrapper", post.userAvatarFrame)}>
                            <Avatar className="relative z-[1] h-10 w-10">
                                <AvatarImage src={post.userAvatar} />
                                <AvatarFallback>{post.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </Link>
                </div>

                {/* Content Column */}
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Link href={`/profile/${post.uid}`}>
                                <p className="font-bold text-sm hover:underline">{post.username}</p>
                            </Link>
                            {post.userRole === 'admin' && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                                        </TooltipTrigger>
                                        <TooltipContent><p>Yönetici</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{timeAgo}</span>
                            {isOwner && !isEditing && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full -mr-2">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /><span>Düzenle</span></DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Sil</span></DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                    
                    {/* Post Text/Editing */}
                    <div className="mt-1 text-sm text-foreground/90">
                        {isEditing ? (
                            <div className="space-y-2">
                                <Textarea
                                    ref={textareaRef}
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="w-full resize-none bg-muted p-2 rounded-lg"
                                    onInput={(e) => {
                                        const target = e.currentTarget;
                                        target.style.height = 'inherit';
                                        target.style.height = `${target.scrollHeight}px`;
                                    }}
                                />
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

                    {/* Image */}
                    {post.imageUrl && !isEditing && (
                        <div className="relative mt-3 h-auto w-full overflow-hidden rounded-xl border">
                             <Image
                                src={post.imageUrl}
                                alt="Gönderi resmi"
                                width={800}
                                height={800}
                                className="h-auto w-full max-h-[600px] object-cover"
                            />
                        </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="mt-3 flex items-center gap-1 -ml-2">
                        <Button variant="ghost" size="icon" className={cn("rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive", isLiked && "text-destructive")} onClick={handleLike} disabled={isLiking || !currentUser}>
                           <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => setShowComments(true)}>
                            <MessageCircle className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Stats */}
                    {(post.likeCount > 0 || post.commentCount > 0) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                            <span>{post.commentCount || 0} yanıt</span>
                            <span className="mx-1">·</span>
                            <span>{post.likeCount || 0} beğeni</span>
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
        </>
    );
}
