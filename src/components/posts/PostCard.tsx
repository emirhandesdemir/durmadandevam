// src/components/posts/PostCard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { Post } from "./PostsFeed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit, Loader2, Send, BadgeCheck } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { deletePost, updatePost, likePost } from "@/lib/actions/postActions";

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


interface PostCardProps {
    post: Post;
}

/**
 * PostCard Bileşeni
 * Tek bir gönderiyi görüntüleyen, düzenleme, silme ve yorum yapma işlevlerini barındıran karttır.
 */
export default function PostCard({ post }: PostCardProps) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    // State'ler
    const [isLiking, setIsLiking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(post.text);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showComments, setShowComments] = useState(false);

    // Kontroller
    const isOwner = currentUser?.uid === post.uid;
    const isLiked = currentUser ? (post.likes || []).includes(currentUser.uid) : false;
    const timeAgo = post.createdAt
        ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: tr })
        : "az önce";

    const textareaRef = useRef<HTMLTextAreaElement>(null);


    // Beğenme fonksiyonu
    const handleLike = async () => {
        if (!currentUser || isLiking) return;
        setIsLiking(true);
        try {
            await likePost(post.id, currentUser.uid, isLiked);
        } catch (error) {
            console.error("Error liking post:", error);
            toast({ variant: "destructive", description: "Beğenirken bir hata oluştu." });
        } finally {
            setIsLiking(false);
        }
    };

    // Silme fonksiyonu
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

    // Düzenlemeyi kaydetme fonksiyonu
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

     // Düzenleme moduna girildiğinde metin alanını otomatik olarak boyutlandır
    if (isEditing && textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${scrollHeight}px`;
    }

    return (
        <>
            <Card className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
                {/* Kart Başlığı: Kullanıcı bilgileri ve seçenekler butonu */}
                <CardHeader className="flex flex-row items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white">
                            <AvatarImage src={post.userAvatar} />
                            <AvatarFallback>{post.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-1.5">
                               <p className="font-bold">{post.username}</p>
                               {post.userRole === 'admin' && (
                                   <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                            <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Yönetici</p>
                                        </TooltipContent>
                                      </Tooltip>
                                   </TooltipProvider>
                               )}
                            </div>
                            <p className="text-sm text-muted-foreground">{timeAgo}</p>
                        </div>
                    </div>
                    {isOwner && !isEditing && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <MoreHorizontal />
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
                </CardHeader>

                {/* Kart İçeriği: Gönderi metni ve resmi veya düzenleme modu */}
                <CardContent className="space-y-4 px-6 pb-2 pt-0">
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
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>İptal</Button>
                                <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Kaydet
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-base leading-relaxed whitespace-pre-wrap">{post.text}</p>
                            {post.imageUrl && (
                                <div className="overflow-hidden rounded-2xl border">
                                    <Image
                                        src={post.imageUrl}
                                        alt="Gönderi resmi"
                                        width={600}
                                        height={400}
                                        className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-105"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </CardContent>

                {/* Kart Alt Bilgisi: Beğeni ve yorum butonları */}
                <CardFooter className="flex items-center justify-start gap-4 p-6 pt-4">
                    <Button 
                        variant="ghost" 
                        className={cn(
                            "group rounded-full px-4 text-muted-foreground hover:bg-red-500/10 hover:text-red-500",
                            isLiked && "text-red-500"
                        )}
                        onClick={handleLike}
                        disabled={isLiking || !currentUser}
                    >
                        <Heart className={cn(
                            "mr-2 transition-transform group-hover:scale-110", 
                            isLiked ? "fill-current" : "group-hover:fill-red-500/50"
                        )} />
                        {post.likeCount || 0}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="group rounded-full px-4 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500"
                      onClick={() => setShowComments(true)}
                    >
                        <MessageCircle className="mr-2 transition-transform group-hover:scale-110" />
                        {post.commentCount || 0}
                    </Button>
                </CardFooter>
            </Card>

            {/* Silme Onay Dialogu */}
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
            
            {/* Yorumlar Paneli */}
            <CommentSheet 
                open={showComments} 
                onOpenChange={setShowComments}
                post={post}
            />
        </>
    );
}
