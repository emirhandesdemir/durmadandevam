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
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    const [isLiking, setIsLiking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(post.text || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showComments, setShowComments] = useState(false);

    const isOwner = currentUser?.uid === post.uid;
    const isLiked = currentUser ? (post.likes || []).includes(currentUser.uid) : false;
    
    const createdAtDate = typeof post.createdAt === 'string' 
      ? new Date(post.createdAt) 
      : (post.createdAt as Timestamp).toDate();

    const timeAgo = post.createdAt
        ? formatDistanceToNow(createdAtDate, { addSuffix: true, locale: tr })
        : "az önce";

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // This effect syncs the local text state with the prop from the parent.
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
        if (!currentUser || isLiking) return;
        setIsLiking(true);
        try {
            await likePost(
                post.id,
                {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
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
            await deletePost(post.id, post.imageUrl);
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
            <div className="w-full animate-in fade-in-50 duration-500 bg-card border-b">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <Link href={`/profile/${post.uid}`} className="flex items-center gap-3 group">
                             <div className={cn("avatar-frame-wrapper", post.userAvatarFrame)}>
                                <Avatar className="relative z-[1] h-10 w-10 border">
                                    <AvatarImage src={post.userAvatar} />
                                    <AvatarFallback>{post.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-sm group-hover:underline">{post.username}</p>
                                    {post.userRole === 'admin' && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Yönetici</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">{timeAgo}</p>
                            </div>
                        </Link>
                        {isOwner && !isEditing && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Düzenle</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Sil</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {isEditing ? (
                            <div className="space-y-2 mt-3">
                                <Textarea
                                    ref={textareaRef}
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="w-full resize-none bg-muted p-2 rounded-lg text-sm"
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
                            editedText && <p className="text-sm leading-relaxed whitespace-pre-wrap mt-3">{editedText}</p>
                        )}
                </div>

                {post.imageUrl && !isEditing && (
                    <div className="w-full mt-2">
                        <Image
                            src={post.imageUrl}
                            alt="Gönderi resmi"
                            width={800}
                            height={800}
                            className="aspect-square w-full object-cover"
                        />
                    </div>
                )}
                
                 <div className="px-4 py-2 flex items-center justify-start gap-1">
                    <Button
                        variant="ghost"
                        className={cn(
                            "group rounded-full px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                            isLiked && "text-destructive"
                        )}
                        onClick={handleLike}
                        disabled={isLiking || !currentUser}
                    >
                        <Heart className={cn(
                            "mr-2 h-4 w-4 transition-transform group-hover:scale-110",
                            isLiked ? "fill-current" : "group-hover:fill-destructive/50"
                        )} />
                        <span className="text-xs">{post.likeCount || 0}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        className="group rounded-full px-3 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        onClick={() => setShowComments(true)}
                    >
                        <MessageCircle className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                        <span className="text-xs">{post.commentCount || 0}</span>
                    </Button>
                </div>
            </div>
            
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bu gönderiyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sil
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <CommentSheet 
                open={showComments} 
                onOpenChange={setShowComments}
                post={post}
            />
        </>
    );
}
