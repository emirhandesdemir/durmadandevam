// src/components/comments/CommentItem.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Reply, Loader2, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { deleteComment } from "@/lib/actions/commentActions";
import Link from 'next/link';
import type { Comment } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

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
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getGiftById } from "@/lib/gifts";
import { Gem } from "lucide-react";

interface CommentItemProps {
    comment: Comment;
    postId: string;
    onReply: (commentId: string, username: string) => void;
}

/**
 * Tek bir yorumu ve onunla ilgili eylemleri (silme, cevaplama) gösteren bileşen.
 */
export default function CommentItem({ comment, postId, onReply }: CommentItemProps) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isOwner = currentUser?.uid === comment.uid;

    const parseTimestamp = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp instanceof Date) return timestamp;
        // Check for Firestore Timestamp object
        if (typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }
        // Check for serialized string from server
        if (typeof timestamp === 'string') {
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) return date;
        }
        return null;
    };
    
    const createdAtDate = parseTimestamp(comment.createdAt);
    const timeAgo = createdAtDate
        ? formatDistanceToNow(createdAtDate, { addSuffix: true, locale: tr })
        : "şimdi";
    
    const sentGift = comment.giftId ? getGiftById(comment.giftId) : null;
    const GiftIcon = sentGift?.icon;
    
    // Yorumu silme fonksiyonu
    const handleDelete = async () => {
        if (!isOwner) return;
        setIsDeleting(true);
        try {
            await deleteComment(postId, comment.id);
            toast({ description: "Yorum silindi." });
        } catch (error) {
            console.error("Yorum silinirken hata:", error);
            toast({ variant: "destructive", description: "Yorum silinirken bir hata oluştu." });
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };


    return (
        <div className="flex items-start gap-3">
             <Link href={`/profile/${comment.uid}`}>
                <div className={cn("avatar-frame-wrapper", comment.userAvatarFrame)}>
                    <Avatar className="relative z-[1] h-9 w-9">
                        <AvatarImage src={comment.photoURL || undefined} />
                        <AvatarFallback>{comment.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
            </Link>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-sm">
                         <Link href={`/profile/${comment.uid}`} className="group">
                             <span className="font-bold group-hover:underline">{comment.username}</span>
                         </Link>
                        {comment.userRole === 'admin' && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><BadgeCheck className="h-4 w-4 text-primary" /></TooltipTrigger>
                                    <TooltipContent><p>Yönetici</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    </div>
                    {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                    onClick={() => setShowDeleteConfirm(true)} 
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Sil</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <div className={cn(
                    "p-3 rounded-xl bg-muted text-sm", 
                    comment.replyTo ? "mt-1" : "",
                    sentGift ? "bg-gradient-to-tr from-yellow-400/10 to-amber-500/10 border-2 border-amber-500/20" : ""
                )}>
                    {sentGift && GiftIcon && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-500/20">
                            <GiftIcon className="h-6 w-6 text-amber-500"/>
                            <p className="text-amber-600 font-bold">{sentGift.name} gönderdi</p>
                        </div>
                    )}
                    {comment.replyTo && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary pl-2 mb-2">
                           @{comment.replyTo.username} adlı kullanıcıya yanıt olarak
                        </p>
                    )}
                    <p className="whitespace-pre-wrap">{comment.text}</p>
                </div>
                <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground" onClick={() => onReply(comment.id, comment.username)}>
                    <Reply className="mr-2 h-4 w-4"/>
                    Cevapla
                </Button>
            </div>
             {/* Silme Onay Dialogu */}
             <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bu yorumu kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
        </div>
    );
}
